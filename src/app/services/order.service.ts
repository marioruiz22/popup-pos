import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { Order, PaymentMethod } from '../models/order';
import { OrderItem } from '../models/order-item';
import { Product } from '../models/product';
import { FIRESTORE } from '../firebase/firebase.providers';
import { PopupSessionService } from './popup-session.service';
import { SettingsService } from './settings.service';

/** @deprecated Migrated into draft storage key. */
const LEGACY_STORAGE_KEY = 'popup-pos-orders';
const DRAFT_STORAGE_KEY = 'popup-pos-draft-orders';
/** @deprecated Completed orders now live in Firestore. */
const COMPLETED_STORAGE_KEY = 'popup-pos-completed-orders';

interface DraftStore {
  orders: Order[];
  currentOrderId: string;
}

/** Firestore document shape for completed orders (doc id = order UUID). */
interface CompletedOrderDoc {
  id: string;
  orderNumber: number;
  customerName?: string;
  items: OrderItem[];
  status: 'completed';
  createdAt: string;
  completedAt: string;
  discount?: number;
  tip?: number;
  subtotal: number;
  total: number;
  paymentMethod?: PaymentMethod;
  amountReceived?: number;
  changeDue?: number;
  deviceName?: string;
  popupId: string;
}

export interface PaymentDetails {
  paymentMethod: PaymentMethod;
  amountReceived?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly firestore = inject(FIRESTORE);
  private readonly settingsService = inject(SettingsService);
  private readonly popupSessionService = inject(PopupSessionService);

  /**
   * Local placeholder until Firebase assigns daily order numbers.
   * Seeded from the max completed order number loaded for the current popup.
   */
  private nextOrderNumber = 1;

  /** In-progress orders. Local only — never synchronized. */
  private draftOrders: Order[] = [];

  /** Completed orders for the current popup (Firestore-backed). */
  private readonly completedOrdersSignal = signal<Order[]>([]);

  private currentOrderId = '';
  private unsubscribeCompleted: Unsubscribe | null = null;
  private boundPopupId: string | null = null;
  private readonly completedSyncError = signal<string | null>(null);

  readonly completedOrdersList = computed(() =>
    this.completedOrdersSignal().filter((order) => order.status === 'completed')
  );

  readonly lastCompletedSyncError = computed(() => this.completedSyncError());

  constructor() {
    this.loadDrafts();

    effect(() => {
      const popupId = this.popupSessionService.currentPopupId();
      untracked(() => this.bindCompletedOrders(popupId));
    });
  }

  /** All orders currently in memory (drafts + completed). Prefer specific getters. */
  getOrders(): Order[] {
    return [...this.draftOrders, ...this.completedOrdersSignal()];
  }

  getDraftOrders(): Order[] {
    return this.draftOrders.filter((order) => order.status === 'draft');
  }

  /** @deprecated Use getDraftOrders(). */
  getOpenOrders(): Order[] {
    return this.getDraftOrders();
  }

  getCompletedOrders(): Order[] {
    return this.completedOrdersList();
  }

  getCurrentOrder(): Order | null {
    if (!this.currentOrderId) {
      return null;
    }

    return this.draftOrders.find((order) => order.id === this.currentOrderId) ?? null;
  }

  createOrder(): Order {
    const order = this.createNewDraft();
    this.draftOrders.push(order);
    this.currentOrderId = order.id;
    this.saveDrafts();
    return order;
  }

  selectOrder(id: string): void {
    if (this.draftOrders.some((order) => order.id === id && order.status === 'draft')) {
      this.currentOrderId = id;
      this.saveDrafts();
    }
  }

  addProduct(product: Product): void {
    let order = this.getCurrentOrder();

    if (!order || order.status !== 'draft') {
      order = this.createOrder();
    }

    const existingItem = order.items.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity++;
      if (product.imageUrl) {
        existingItem.imageUrl = product.imageUrl;
      }
    } else {
      const item: OrderItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      };
      if (product.imageUrl) {
        item.imageUrl = product.imageUrl;
      }
      order.items.push(item);
    }

    this.saveDrafts();
  }

  /**
   * Completes the current draft and upserts it to Firestore under the same UUID.
   * Re-completing a reopened order updates that same document (no duplicate).
   * Returns false if the cloud write fails (order stays a draft).
   */
  async completeOrder(details: PaymentDetails): Promise<boolean> {
    const order = this.getCurrentOrder();

    if (!order || order.status !== 'draft' || order.items.length === 0) {
      return false;
    }

    const total = this.getTotal(order);

    if (details.paymentMethod === 'cash') {
      const amountReceived = details.amountReceived ?? 0;
      if (amountReceived < total) {
        return false;
      }

      order.paymentMethod = 'cash';
      order.amountReceived = amountReceived;
      order.changeDue = Number((amountReceived - total).toFixed(2));
    } else {
      order.paymentMethod = 'mobile';
      order.amountReceived = total;
      order.changeDue = 0;
    }

    const popupId = this.popupSessionService.getPopupId();
    if (!popupId) {
      this.completedSyncError.set('Join a popup before completing orders to the cloud.');
      return false;
    }

    // Assign display number only on first completion. Reopened orders keep theirs.
    // TODO(firebase): Replace with a Firestore daily counter transaction per popup.
    if (order.orderNumber == null) {
      order.orderNumber = this.assignLocalOrderNumber();
    }

    const completedAt = new Date();
    const deviceName = this.settingsService.getDeviceName().trim() || undefined;
    const snapshot: Order = {
      ...order,
      items: order.items.map((item) => ({ ...item })),
      status: 'completed',
      completedAt,
      deviceName,
      popupId,
    };

    try {
      await setDoc(this.orderDocRef(popupId, snapshot.id), this.toCompletedDoc(snapshot, popupId));
      this.completedSyncError.set(null);
    } catch (error) {
      console.error('Failed to sync completed order to Firestore', error);
      this.completedSyncError.set('Could not sync completed order. Check your connection.');
      // Leave payment fields on the draft so the cashier can retry without re-entering cash.
      this.saveDrafts();
      return false;
    }

    order.status = 'completed';
    order.completedAt = completedAt;
    order.deviceName = deviceName;
    order.popupId = popupId;

    this.moveDraftToCompletedLocal(order);
    this.selectNextDraftOrder();
    this.saveDrafts();
    return true;
  }

  /** @deprecated Use completeOrder(). */
  markPaid(details: PaymentDetails): void {
    void this.completeOrder(details);
  }

  /**
   * Reopens a completed order as a draft with the same UUID and order number.
   * Removes it from the completed Firestore collection so history stays accurate;
   * completing again upserts the same document id.
   */
  async reopenOrder(id: string): Promise<void> {
    const orders = this.completedOrdersSignal();
    const index = orders.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }

    const order = { ...orders[index], items: orders[index].items.map((item) => ({ ...item })) };
    if (order.status !== 'completed') {
      return;
    }

    const popupId = order.popupId || this.popupSessionService.getPopupId();

    this.completedOrdersSignal.update((list) => list.filter((item) => item.id !== id));

    order.status = 'draft';
    order.paymentMethod = undefined;
    order.amountReceived = undefined;
    order.changeDue = undefined;
    order.completedAt = undefined;
    order.deviceName = undefined;
    order.popupId = undefined;
    // Keep order.id and order.orderNumber.

    this.draftOrders.push(order);
    this.currentOrderId = id;
    this.saveDrafts();

    if (popupId) {
      try {
        await deleteDoc(this.orderDocRef(popupId, id));
        this.completedSyncError.set(null);
      } catch {
        this.completedSyncError.set('Could not update cloud order while reopening.');
      }
    }
  }

  getOrderById(id: string): Order | null {
    return (
      this.draftOrders.find((order) => order.id === id) ??
      this.completedOrdersSignal().find((order) => order.id === id) ??
      null
    );
  }

  setCustomerName(name: string, orderId?: string): void {
    const order = orderId ? this.getOrderById(orderId) : this.getCurrentOrder();

    if (!order || order.status !== 'draft') {
      return;
    }

    const trimmed = name.trim();
    order.customerName = trimmed || undefined;
    this.saveDrafts();
  }

  async deleteOrder(id: string): Promise<void> {
    const draftIndex = this.draftOrders.findIndex((order) => order.id === id);
    if (draftIndex !== -1) {
      this.draftOrders.splice(draftIndex, 1);

      if (this.currentOrderId === id) {
        this.selectNextDraftOrder();
      }

      this.saveDrafts();
      return;
    }

    const completed = this.completedOrdersSignal().find((order) => order.id === id);
    if (!completed) {
      return;
    }

    this.completedOrdersSignal.update((list) => list.filter((order) => order.id !== id));

    const popupId = completed.popupId || this.popupSessionService.getPopupId();
    if (popupId) {
      try {
        await deleteDoc(this.orderDocRef(popupId, id));
        this.completedSyncError.set(null);
      } catch {
        this.completedSyncError.set('Could not delete completed order from the cloud.');
      }
    }
  }

  getPaidOrdersTotal(): number {
    return this.getCompletedOrders().reduce(
      (total, order) => total + this.getTotal(order),
      0
    );
  }

  getPaymentMethodTotals(): { method: PaymentMethod | 'unknown'; count: number; total: number }[] {
    const totals = new Map<PaymentMethod | 'unknown', { count: number; total: number }>();

    for (const order of this.getCompletedOrders()) {
      const method = order.paymentMethod ?? 'unknown';
      const existing = totals.get(method) ?? { count: 0, total: 0 };
      existing.count += 1;
      existing.total += this.getTotal(order);
      totals.set(method, existing);
    }

    return (['cash', 'mobile', 'unknown'] as const)
      .filter((method) => totals.has(method))
      .map((method) => ({
        method,
        count: totals.get(method)!.count,
        total: totals.get(method)!.total,
      }));
  }

  getItemTypeTotals(): { name: string; quantity: number; total: number }[] {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();

    for (const order of this.getCompletedOrders()) {
      for (const item of order.items) {
        const existing = totals.get(item.productId);

        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.price * item.quantity;
        } else {
          totals.set(item.productId, {
            name: item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
          });
        }
      }
    }

    return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  increaseQuantity(productId: string): void {
    const item = this.findItem(productId);
    if (item) {
      item.quantity++;
      this.saveDrafts();
    }
  }

  decreaseQuantity(productId: string): void {
    const item = this.findItem(productId);
    if (!item) {
      return;
    }

    if (item.quantity <= 1) {
      this.removeItem(productId);
    } else {
      item.quantity--;
      this.saveDrafts();
    }
  }

  removeItem(productId: string): void {
    const order = this.getCurrentOrder();
    if (!order) {
      return;
    }

    order.items = order.items.filter((item) => item.productId !== productId);
    this.saveDrafts();
  }

  setDiscount(amount: number): void {
    const order = this.getCurrentOrder();
    if (!order || order.status !== 'draft') {
      return;
    }

    const subtotal = this.getSubtotal(order);
    const discount = Math.max(0, Math.min(subtotal, Number(amount) || 0));
    order.discount = Number(discount.toFixed(2)) || undefined;
    this.saveDrafts();
  }

  setTip(amount: number): void {
    const order = this.getCurrentOrder();
    if (!order || order.status !== 'draft') {
      return;
    }

    const tip = Math.max(0, Number(amount) || 0);
    order.tip = Number(tip.toFixed(2)) || undefined;
    this.saveDrafts();
  }

  getSubtotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    if (!target) {
      return 0;
    }

    return target.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getDiscount(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    return target?.discount ?? 0;
  }

  getTip(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    return target?.tip ?? 0;
  }

  getTotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    if (!target) {
      return 0;
    }

    const subtotal = this.getSubtotal(target);
    const discount = Math.min(this.getDiscount(target), subtotal);
    const tip = this.getTip(target);
    return Number((subtotal - discount + tip).toFixed(2));
  }

  getItemCount(order: Order): number {
    return order.items.reduce((count, item) => count + item.quantity, 0);
  }

  private bindCompletedOrders(popupId: string | null): void {
    if (popupId === this.boundPopupId && this.unsubscribeCompleted) {
      return;
    }

    this.teardownCompletedListener();
    this.boundPopupId = popupId;
    this.completedSyncError.set(null);

    if (!popupId) {
      this.completedOrdersSignal.set([]);
      this.nextOrderNumber = 1;
      return;
    }

    try {
      const ordersRef = collection(this.firestore, 'popups', popupId, 'orders');
      this.unsubscribeCompleted = onSnapshot(
        ordersRef,
        (snapshot) => {
          const orders = snapshot.docs
            .map((orderDoc) => this.fromCompletedDoc(orderDoc.id, orderDoc.data() as CompletedOrderDoc))
            .filter((order) => order.status === 'completed');

          this.completedOrdersSignal.set(orders);
          this.nextOrderNumber = Math.max(
            1,
            ...orders.map((order) => (order.orderNumber ?? 0) + 1)
          );
          this.completedSyncError.set(null);
        },
        () => {
          this.completedSyncError.set('Could not load completed orders from the cloud.');
        }
      );
    } catch {
      this.completedOrdersSignal.set([]);
      this.completedSyncError.set('Could not load completed orders from the cloud.');
    }
  }

  private teardownCompletedListener(): void {
    this.unsubscribeCompleted?.();
    this.unsubscribeCompleted = null;
  }

  private orderDocRef(popupId: string, orderId: string) {
    return doc(this.firestore, 'popups', popupId, 'orders', orderId);
  }

  private moveDraftToCompletedLocal(order: Order): void {
    const draftIndex = this.draftOrders.findIndex((item) => item.id === order.id);
    if (draftIndex !== -1) {
      this.draftOrders.splice(draftIndex, 1);
    }

    this.completedOrdersSignal.update((list) => {
      const existingIndex = list.findIndex((item) => item.id === order.id);
      if (existingIndex === -1) {
        return [...list, order];
      }
      const next = [...list];
      next[existingIndex] = order;
      return next;
    });
  }

  private selectNextDraftOrder(): void {
    const nextDraft = this.draftOrders.find((order) => order.status === 'draft');
    this.currentOrderId = nextDraft?.id ?? '';
  }

  private findItem(productId: string) {
    return this.getCurrentOrder()?.items.find((item) => item.productId === productId);
  }

  private createNewDraft(): Order {
    return {
      id: crypto.randomUUID(),
      items: [],
      status: 'draft',
      createdAt: new Date(),
    };
  }

  private assignLocalOrderNumber(): number {
    return this.nextOrderNumber++;
  }

  private toCompletedDoc(order: Order, popupId: string): CompletedOrderDoc {
    const subtotal = this.getSubtotal(order);
    const discount = this.getDiscount(order);
    const tip = this.getTip(order);
    const total = this.getTotal(order);

    // Firestore rejects `undefined` field values. Build a plain object with only set fields.
    const docData: CompletedOrderDoc = {
      id: order.id,
      orderNumber: order.orderNumber ?? 0,
      items: order.items.map((item) => this.toCompletedItemDoc(item)),
      status: 'completed',
      createdAt: order.createdAt.toISOString(),
      completedAt: (order.completedAt ?? new Date()).toISOString(),
      subtotal,
      total,
      popupId,
    };

    if (order.customerName) {
      docData.customerName = order.customerName;
    }
    if (discount) {
      docData.discount = discount;
    }
    if (tip) {
      docData.tip = tip;
    }
    if (order.paymentMethod) {
      docData.paymentMethod = order.paymentMethod;
    }
    if (order.amountReceived != null) {
      docData.amountReceived = order.amountReceived;
    }
    if (order.changeDue != null) {
      docData.changeDue = order.changeDue;
    }
    if (order.deviceName) {
      docData.deviceName = order.deviceName;
    }

    return docData;
  }

  /** Line items for Firestore — omit undefined/optional image payloads (can be huge data URLs). */
  private toCompletedItemDoc(item: OrderItem): OrderItem {
    return {
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    };
  }

  private fromCompletedDoc(id: string, data: CompletedOrderDoc): Order {
    return {
      id,
      orderNumber: typeof data.orderNumber === 'number' ? data.orderNumber : undefined,
      customerName: data.customerName,
      items: Array.isArray(data.items) ? data.items : [],
      status: 'completed',
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      discount: data.discount,
      tip: data.tip,
      paymentMethod: data.paymentMethod,
      amountReceived: data.amountReceived,
      changeDue: data.changeDue,
      deviceName: data.deviceName,
      popupId: data.popupId,
    };
  }

  private loadDrafts(): void {
    this.migrateLegacyOrdersIfNeeded();

    const draftStore = this.readDraftStore();
    this.draftOrders = draftStore.orders.map((order) => this.normalizeOrder(order));
    this.currentOrderId =
      this.draftOrders.find((order) => order.id === draftStore.currentOrderId && order.status === 'draft')
        ?.id ?? '';

    this.saveDrafts();

    // Completed orders are loaded from Firestore for the active popup.
    localStorage.removeItem(COMPLETED_STORAGE_KEY);
  }

  private migrateLegacyOrdersIfNeeded(): void {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return;
    }

    if (localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(COMPLETED_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    try {
      const data = JSON.parse(raw) as {
        orders?: Array<Record<string, unknown>>;
        currentOrderId?: string;
      };

      if (!Array.isArray(data.orders)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return;
      }

      const drafts: Order[] = [];

      for (const rawOrder of data.orders) {
        const legacyStatus = String(rawOrder['status'] ?? '');
        const order = this.normalizeOrder(rawOrder as unknown as Order);

        if (legacyStatus === 'paid' || order.status === 'completed' || order.status === 'cancelled') {
          // Completed legacy history is not auto-uploaded; start fresh in Firestore.
          continue;
        }

        order.status = 'draft';
        order.orderNumber = undefined;
        order.completedAt = undefined;
        drafts.push(order);
      }

      const currentOrderId =
        drafts.find((order) => order.id === data.currentOrderId)?.id ?? drafts[0]?.id ?? '';

      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ orders: drafts, currentOrderId } satisfies DraftStore)
      );
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  private normalizeOrder(order: Order & { paidAt?: Date | string }): Order {
    const legacyStatus = String((order as { status?: string }).status ?? '');
    const legacyPaidAt = (order as { paidAt?: Date | string }).paidAt
      ? new Date((order as { paidAt?: Date | string }).paidAt as Date | string)
      : undefined;
    const completedAt = order.completedAt ? new Date(order.completedAt) : legacyPaidAt;

    let status: Order['status'];
    if (legacyStatus === 'open' || legacyStatus === 'draft') {
      status = 'draft';
    } else if (legacyStatus === 'paid' || legacyStatus === 'completed') {
      status = 'completed';
    } else if (legacyStatus === 'cancelled') {
      status = 'cancelled';
    } else {
      status = completedAt ? 'completed' : 'draft';
    }

    const normalized: Order = {
      id: order.id,
      orderNumber: typeof order.orderNumber === 'number' ? order.orderNumber : undefined,
      customerName: order.customerName,
      items: order.items ?? [],
      status,
      createdAt: new Date(order.createdAt),
      completedAt,
      discount: order.discount,
      tip: order.tip,
      paymentMethod: order.paymentMethod,
      amountReceived: order.amountReceived,
      changeDue: order.changeDue,
      deviceName: order.deviceName,
      popupId: order.popupId,
    };

    if (normalized.status === 'draft' && !normalized.completedAt && legacyStatus === 'open') {
      normalized.orderNumber = undefined;
    }

    return normalized;
  }

  private readDraftStore(): DraftStore {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return { orders: [], currentOrderId: '' };
    }

    try {
      const data = JSON.parse(raw) as DraftStore;
      return {
        orders: Array.isArray(data.orders) ? data.orders : [],
        currentOrderId: data.currentOrderId ?? '',
      };
    } catch {
      return { orders: [], currentOrderId: '' };
    }
  }

  private saveDrafts(): void {
    const data: DraftStore = {
      orders: this.draftOrders,
      currentOrderId: this.currentOrderId,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  }
}
