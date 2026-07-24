import { Injectable } from '@angular/core';
import { Order, PaymentMethod } from '../models/order';
import { Product } from '../models/product';
import { PopupSessionService } from './popup-session.service';
import { SettingsService } from './settings.service';

/** @deprecated Migrated into draft + completed storage keys. */
const LEGACY_STORAGE_KEY = 'popup-pos-orders';

const DRAFT_STORAGE_KEY = 'popup-pos-draft-orders';
const COMPLETED_STORAGE_KEY = 'popup-pos-completed-orders';

interface DraftStore {
  orders: Order[];
  currentOrderId: string;
}

interface CompletedStore {
  orders: Order[];
  /**
   * Local placeholder counter until Firebase assigns daily order numbers.
   * TODO(firebase): Remove local nextOrderNumber. Firestore will assign the next
   * daily sequence (resets to 1 each calendar day) and guarantee uniqueness.
   */
  nextOrderNumber: number;
}

export interface PaymentDetails {
  paymentMethod: PaymentMethod;
  amountReceived?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  /**
   * TODO(firebase): Replace with a cloud-assigned daily sequence.
   * Local counter is temporary so completed orders still get display numbers offline.
   */
  private nextOrderNumber = 1;

  /** In-progress orders. Local only — never synchronized. */
  private draftOrders: Order[] = [];

  /**
   * Completed orders.
   * TODO(firebase): Persist/load these from Firestore instead of localStorage.
   * Drafts must never be written to Firestore.
   */
  private completedOrders: Order[] = [];

  private currentOrderId = '';

  constructor(
    private settingsService: SettingsService,
    private popupSessionService: PopupSessionService
  ) {
    this.load();
  }

  /** All orders currently in memory (drafts + completed). Prefer specific getters. */
  getOrders(): Order[] {
    return [...this.draftOrders, ...this.completedOrders];
  }

  getDraftOrders(): Order[] {
    return this.draftOrders.filter((order) => order.status === 'draft');
  }

  /** @deprecated Use getDraftOrders(). */
  getOpenOrders(): Order[] {
    return this.getDraftOrders();
  }

  getCompletedOrders(): Order[] {
    return this.completedOrders.filter((order) => order.status === 'completed');
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
      order.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      });
    }

    this.saveDrafts();
  }

  /**
   * Completes the current draft: assigns an order number if needed, stamps payment/device,
   * and moves the order into completed storage (updating in place when re-completing).
   */
  completeOrder(details: PaymentDetails): void {
    const order = this.getCurrentOrder();

    if (!order || order.status !== 'draft' || order.items.length === 0) {
      return;
    }

    const total = this.getTotal(order);

    if (details.paymentMethod === 'cash') {
      const amountReceived = details.amountReceived ?? 0;
      if (amountReceived < total) {
        return;
      }

      order.paymentMethod = 'cash';
      order.amountReceived = amountReceived;
      order.changeDue = Number((amountReceived - total).toFixed(2));
    } else {
      order.paymentMethod = 'mobile';
      order.amountReceived = total;
      order.changeDue = 0;
    }

    // Assign display number only on first completion. Reopened orders keep theirs.
    // TODO(firebase): Replace assignLocalOrderNumber() with a Firestore transaction /
    // callable that returns the next number for the current calendar day (starts at 1 daily).
    if (order.orderNumber == null) {
      order.orderNumber = this.assignLocalOrderNumber();
    }

    order.status = 'completed';
    order.completedAt = new Date();
    const deviceName = this.settingsService.getDeviceName().trim();
    order.deviceName = deviceName || undefined;
    const popupId = this.popupSessionService.getPopupId();
    order.popupId = popupId || undefined;

    this.moveDraftToCompleted(order);
    this.selectNextDraftOrder();
    this.saveDrafts();
    this.saveCompleted();
  }

  /** @deprecated Use completeOrder(). */
  markPaid(details: PaymentDetails): void {
    this.completeOrder(details);
  }

  /**
   * Reopens a completed order as a draft with the same UUID and order number.
   * Does not create a new order.
   */
  reopenOrder(id: string): void {
    const index = this.completedOrders.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }

    const order = this.completedOrders[index];
    if (order.status !== 'completed') {
      return;
    }

    this.completedOrders.splice(index, 1);

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
    this.saveCompleted();
  }

  getOrderById(id: string): Order | null {
    return (
      this.draftOrders.find((order) => order.id === id) ??
      this.completedOrders.find((order) => order.id === id) ??
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

  deleteOrder(id: string): void {
    const draftIndex = this.draftOrders.findIndex((order) => order.id === id);
    if (draftIndex !== -1) {
      this.draftOrders.splice(draftIndex, 1);

      if (this.currentOrderId === id) {
        this.selectNextDraftOrder();
      }

      this.saveDrafts();
      return;
    }

    const completedIndex = this.completedOrders.findIndex((order) => order.id === id);
    if (completedIndex !== -1) {
      this.completedOrders.splice(completedIndex, 1);
      // TODO(firebase): Also delete the Firestore document for this completed order.
      this.saveCompleted();
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

  private moveDraftToCompleted(order: Order): void {
    const draftIndex = this.draftOrders.findIndex((item) => item.id === order.id);
    if (draftIndex !== -1) {
      this.draftOrders.splice(draftIndex, 1);
    }

    const existingIndex = this.completedOrders.findIndex((item) => item.id === order.id);
    if (existingIndex !== -1) {
      this.completedOrders[existingIndex] = order;
    } else {
      this.completedOrders.push(order);
    }

    // TODO(firebase): Upsert this completed order document in Firestore (same UUID).
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

  /**
   * Temporary local numbering until Firebase owns the sequence.
   * TODO(firebase): Delete this method; daily reset + uniqueness come from Firestore.
   */
  private assignLocalOrderNumber(): number {
    return this.nextOrderNumber++;
  }

  private load(): void {
    this.migrateLegacyOrdersIfNeeded();

    const draftStore = this.readDraftStore();
    this.draftOrders = draftStore.orders.map((order) => this.normalizeOrder(order));
    this.currentOrderId =
      this.draftOrders.find((order) => order.id === draftStore.currentOrderId && order.status === 'draft')
        ?.id ?? '';

    const completedStore = this.readCompletedStore();
    this.completedOrders = completedStore.orders.map((order) => this.normalizeOrder(order));
    this.nextOrderNumber = Math.max(
      completedStore.nextOrderNumber ?? 1,
      ...this.completedOrders.map((order) => (order.orderNumber ?? 0) + 1),
      1
    );

    this.saveDrafts();
    this.saveCompleted();
  }

  private migrateLegacyOrdersIfNeeded(): void {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return;
    }

    // Skip if new stores already exist.
    if (localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(COMPLETED_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    try {
      const data = JSON.parse(raw) as {
        orders?: Array<Record<string, unknown>>;
        currentOrderId?: string;
        nextOrderNumber?: number;
      };

      if (!Array.isArray(data.orders)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return;
      }

      const drafts: Order[] = [];
      const completed: Order[] = [];

      for (const rawOrder of data.orders) {
        const legacyStatus = String(rawOrder['status'] ?? '');
        const order = this.normalizeOrder(rawOrder as unknown as Order);

        if (legacyStatus === 'paid' || order.status === 'completed') {
          order.status = 'completed';
          completed.push(order);
        } else if (legacyStatus === 'cancelled' || order.status === 'cancelled') {
          order.status = 'cancelled';
          // Cancelled legacy orders are kept with completed store for history simplicity.
          completed.push(order);
        } else {
          order.status = 'draft';
          order.orderNumber = undefined;
          order.completedAt = undefined;
          drafts.push(order);
        }
      }

      const currentOrderId =
        drafts.find((order) => order.id === data.currentOrderId)?.id ?? drafts[0]?.id ?? '';

      const nextOrderNumber = Math.max(
        data.nextOrderNumber ?? 1,
        ...completed.map((order) => (order.orderNumber ?? 0) + 1),
        1
      );

      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ orders: drafts, currentOrderId } satisfies DraftStore)
      );
      localStorage.setItem(
        COMPLETED_STORAGE_KEY,
        JSON.stringify({ orders: completed, nextOrderNumber } satisfies CompletedStore)
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
      // Legacy in-progress orders received numbers at creation; drafts should not.
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

  private readCompletedStore(): CompletedStore {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) {
      return { orders: [], nextOrderNumber: 1 };
    }

    try {
      const data = JSON.parse(raw) as CompletedStore;
      return {
        orders: Array.isArray(data.orders) ? data.orders : [],
        nextOrderNumber: data.nextOrderNumber ?? 1,
      };
    } catch {
      return { orders: [], nextOrderNumber: 1 };
    }
  }

  private saveDrafts(): void {
    // Drafts stay on-device only.
    const data: DraftStore = {
      orders: this.draftOrders,
      currentOrderId: this.currentOrderId,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  }

  private saveCompleted(): void {
    // TODO(firebase): Sync completedOrders to Firestore; keep local cache optional for offline.
    const data: CompletedStore = {
      orders: this.completedOrders,
      nextOrderNumber: this.nextOrderNumber,
    };
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(data));
  }
}
