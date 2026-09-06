import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Plus, Search, Filter, AlertTriangle,
  CheckCircle2, PackagePlus, RefreshCw, Printer, Receipt,
  TrendingUp, DollarSign, Layers, ArrowUpDown, X,
  Trash2, Edit3, UserCheck, CreditCard, Sparkles,
  ChevronRight, ArrowRight, ShieldAlert, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  SupplementCategory, SupplementProduct, SupplementSale,
  SupplementSummary, Member, SupplementReceiptData, SupplementPayment
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { SupplementReceiptModal } from '../components/receipts/SupplementReceiptModal';
import { Modal } from '../components/common/Modal';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';
import { getTodayDateString } from '../utils/date';

interface SupplementsProps {
  initialTab?: 'inventory' | 'sales' | 'pending_dues';
}

export const Supplements: React.FC<SupplementsProps> = ({ initialTab = 'inventory' }) => {
  // Data States
  const [products, setProducts] = useState<SupplementProduct[]>([]);
  const [categories, setCategories] = useState<SupplementCategory[]>([]);
  const [sales, setSales] = useState<SupplementSale[]>([]);
  const [pendingDues, setPendingDues] = useState<SupplementSale[]>([]);
  const [payments, setPayments] = useState<SupplementPayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<SupplementSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales' | 'pending_dues'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>('');
  const [duesSearchQuery, setDuesSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState<boolean>(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<SupplementProduct | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<SupplementReceiptData | null>(null);

  // Modal: Collect Due
  const [isCollectModalOpen, setIsCollectModalOpen] = useState<boolean>(false);
  const [collectTargetSale, setCollectTargetSale] = useState<SupplementSale | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectDate, setCollectDate] = useState<string>(getTodayDateString());
  const [collectMethod, setCollectMethod] = useState<string>('UPI');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [isSubmittingCollect, setIsSubmittingCollect] = useState<boolean>(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  // Form States: New Category
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDesc, setCategoryDesc] = useState<string>('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);

  // Form States: New Product
  const [productForm, setProductForm] = useState({
    name: '',
    brand: 'Optimum Nutrition',
    category: '',
    flavor: 'Chocolate',
    weight_or_servings: '1 kg / 30 servings',
    cost_price: '',
    selling_price: '',
    stock_quantity: '10',
    min_stock_alert: '3',
  });

  // Form States: Edit Product
  const [isEditProductOpen, setIsEditProductOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    brand: '',
    category: '',
    flavor: '',
    weight_or_servings: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    min_stock_alert: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // In-App Delete Confirmation States (replacing browser window.confirm)
  const [productToDelete, setProductToDelete] = useState<SupplementProduct | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);

  // Form States: Restock
  const [restockQty, setRestockQty] = useState<string>('5');
  const [restockCost, setRestockCost] = useState<string>('');

  // Form States: New Sale (POS)
  const [customerType, setCustomerType] = useState<'member' | 'walk_in'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [saleItems, setSaleItems] = useState<{ productId: number; quantity: number }[]>([
    { productId: 0, quantity: 1 }
  ]);
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [isPaidAmountManuallyEdited, setIsPaidAmountManuallyEdited] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodData, catData, salesData, summaryData, membersData, duesData, paymentsData] = await Promise.all([
        api.getSupplementProducts(),
        api.getSupplementCategories(),
        api.getSupplementSales(),
        api.getSupplementSummary(),
        api.getMembers(),
        api.getSupplementPendingDues(),
        api.getSupplementPayments(),
      ]);
      setProducts(prodData);
      setCategories(catData);
      setSales(salesData);
      setSummary(summaryData);
      setMembers(membersData);
      setPendingDues(duesData);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Failed to load supplements data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReceipts = useMemo(() => {
    if (!salesSearchQuery.trim()) return payments;
    const q = salesSearchQuery.toLowerCase().trim();
    return payments.filter(
      (p) =>
        p.receipt_number?.toLowerCase().includes(q) ||
        p.customer_name?.toLowerCase().includes(q) ||
        p.member_id?.toLowerCase().includes(q) ||
        p.items_summary?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
    );
  }, [payments, salesSearchQuery]);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.flavor && p.flavor.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || (p.category && p.category.toString() === selectedCategory);

    const matchesLowStock = !showLowStockOnly || (p.is_low_stock || p.stock_quantity <= p.min_stock_alert);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Searchable Select Options for POS & Modals
  const memberSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return members.map((m) => {
      let badgeColor: 'emerald' | 'amber' | 'rose' | 'slate' = 'slate';
      if (m.membership_status === 'ACTIVE') badgeColor = 'emerald';
      else if (m.membership_status === 'EXPIRING_SOON') badgeColor = 'amber';
      else if (m.membership_status === 'EXPIRED') badgeColor = 'rose';

      return {
        value: m.id.toString(),
        label: m.full_name,
        sublabel: `+91 ${m.phone}`,
        badge: `${m.member_id} • ${m.membership_status}`,
        badgeColor,
        searchKey: `${m.full_name} ${m.phone} ${m.member_id}`,
      };
    });
  }, [members]);

  const productSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.brand})`,
      sublabel: `₹${Number(p.selling_price).toLocaleString('en-IN')}${p.flavor ? ' • ' + p.flavor : ''}`,
      badge: p.stock_quantity === 0 ? 'Out of Stock' : `Stock: ${p.stock_quantity}`,
      badgeColor: p.stock_quantity === 0 ? 'rose' : p.stock_quantity <= 5 ? 'amber' : 'emerald',
      disabled: p.stock_quantity === 0,
      searchKey: `${p.name} ${p.brand} ${p.flavor || ''} ${p.sku_barcode || p.weight_or_servings || ''}`,
    }));
  }, [products]);

  const categorySelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: '-- General Category --' },
      ...categories.map((cat) => ({
        value: cat.id.toString(),
        label: cat.name,
        sublabel: cat.description || undefined,
        searchKey: `${cat.name} ${cat.description || ''}`,
      })),
    ];
  }, [categories]);

  // Handle Add Product Submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSupplementProduct({
        name: productForm.name,
        brand: productForm.brand,
        category: productForm.category ? parseInt(productForm.category) : null,
        flavor: productForm.flavor,
        weight_or_servings: productForm.weight_or_servings,
        cost_price: parseFloat(productForm.cost_price) || 0,
        selling_price: parseFloat(productForm.selling_price) || 0,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        min_stock_alert: parseInt(productForm.min_stock_alert) || 3,
        is_active: true,
      });
      setIsAddProductOpen(false);
      setProductForm({
        name: '',
        brand: 'Optimum Nutrition',
        category: '',
        flavor: 'Chocolate',
        weight_or_servings: '1 kg / 30 servings',
        cost_price: '',
        selling_price: '',
        stock_quantity: '10',
        min_stock_alert: '3',
      });
      loadData();
      setToast({
        message: `Product "${productForm.name}" was successfully added!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.error || 'Failed to create product.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Handle Restock Submit
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRestock) return;
    try {
      const qty = parseInt(restockQty) || 0;
      const cost = restockCost ? parseFloat(restockCost) : undefined;
      const prodName = selectedProductForRestock.name;
      await api.restockSupplementProduct(selectedProductForRestock.id, qty, cost);
      setIsRestockOpen(false);
      setSelectedProductForRestock(null);
      setRestockQty('5');
      setRestockCost('');
      loadData();
      setToast({
        message: `Restocked ${qty} units of "${prodName}"!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.error || 'Failed to restock product.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // POS Sale Item Calculations
  const calculateGrossTotal = () => {
    return saleItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const price = product ? Number(product.selling_price) : 0;
      return sum + price * (item.quantity || 1);
    }, 0);
  };

  const calculateFinalTotal = () => {
    const gross = calculateGrossTotal();
    const discount = parseFloat(discountAmount) || 0;
    return Math.max(0, gross - discount);
  };

  // Auto-sync paidAmount with calculateFinalTotal if not manually modified
  useEffect(() => {
    if (!isPaidAmountManuallyEdited) {
      const ft = calculateFinalTotal();
      setPaidAmount(ft > 0 ? ft.toString() : '');
    }
  }, [saleItems, discountAmount, products, isPaidAmountManuallyEdited]);

  // Handle Create POS Sale
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);

    // Validate Items
    const validItems = saleItems.filter((it) => it.productId > 0 && it.quantity > 0);
    if (validItems.length === 0) {
      setSaleError('Please select at least one supplement product.');
      return;
    }

    // Validate Customer
    let custName = walkInName.trim();
    let custPhone = walkInPhone.trim();
    let memberIdVal: number | null = null;

    if (customerType === 'member') {
      if (!selectedMemberId) {
        setSaleError('Please select a gym member.');
        return;
      }
      const memberObj = members.find((m) => m.id.toString() === selectedMemberId);
      if (memberObj) {
        custName = memberObj.full_name;
        custPhone = memberObj.phone;
        memberIdVal = memberObj.id;
      }
    } else {
      if (!custName) {
        custName = 'Walk-in Customer';
      }
    }

    // Check stock availability
    for (const it of validItems) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod && prod.stock_quantity < it.quantity) {
        setSaleError(`Insufficient stock for '${prod.name}'. Only ${prod.stock_quantity} available.`);
        return;
      }
    }

    // Format saleDate for backend
    const todayStr = getTodayDateString();
    let formattedSaleDate: string;
    if (!saleDate || saleDate === todayStr) {
      formattedSaleDate = new Date().toISOString();
    } else {
      const now = new Date();
      const [y, m, d] = saleDate.split('-').map(Number);
      const customDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      formattedSaleDate = customDate.toISOString();
    }

    setIsSubmittingSale(true);
    try {
      const finalAmt = calculateFinalTotal();
      const enteredPaid = paidAmount === '' ? finalAmt : Math.max(0, parseFloat(paidAmount) || 0);

      const payload = {
        member: memberIdVal,
        customer_name: custName,
        customer_phone: custPhone,
        discount: parseFloat(discountAmount) || 0,
        paid_amount: enteredPaid,
        payment_method: paymentMethod,
        sale_date: formattedSaleDate,
        notes: saleNotes,
        items: validItems.map((it) => {
          const prod = products.find((p) => p.id === it.productId);
          return {
            product: it.productId,
            quantity: it.quantity,
            unit_price: prod ? parseFloat(prod.selling_price as any) : 0,
          };
        }),
      };

      const createdSale = await api.createSupplementSale(payload);
      const receiptData = await api.getSupplementReceipt(createdSale.id);

      setIsNewSaleOpen(false);
      resetSaleForm();
      loadData();
      setActiveReceipt(receiptData);
      setToast({
        message: `Sale invoice #${createdSale.invoice_number || ''} recorded successfully!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      const data = err.response?.data;
      let errorMsg = 'Failed to record sale.';
      if (typeof data === 'string') {
        errorMsg = data;
      } else if (data?.detail && typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (data?.items) {
        if (typeof data.items === 'string') {
          errorMsg = data.items;
        } else if (Array.isArray(data.items)) {
          const firstErr = data.items[0];
          if (typeof firstErr === 'string') {
            errorMsg = firstErr;
          } else if (typeof firstErr === 'object' && firstErr !== null) {
            const firstKey = Object.keys(firstErr)[0];
            const val = firstErr[firstKey];
            errorMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
          }
        } else if (typeof data.items === 'object') {
          const firstKey = Object.keys(data.items)[0];
          const val = data.items[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : (typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
      } else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        errorMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
      }
      setSaleError(errorMsg);
      setToast({
        message: errorMsg,
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const resetSaleForm = () => {
    setCustomerType('member');
    setSelectedMemberId('');
    setWalkInName('');
    setWalkInPhone('');
    setSaleDate(getTodayDateString());
    setSaleItems([{ productId: 0, quantity: 1 }]);
    setDiscountAmount('0');
    setPaidAmount('');
    setIsPaidAmountManuallyEdited(false);
    setPaymentMethod('UPI');
    setSaleNotes('');
    setSaleError(null);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('Category name is required.');
      return;
    }
    setIsSubmittingCategory(true);
    setCategoryError(null);
    try {
      const newCat = await api.createSupplementCategory({
        name: categoryName.trim(),
        description: categoryDesc.trim(),
      });
      const updatedCats = await api.getSupplementCategories();
      setCategories(updatedCats);
      setSelectedCategory(newCat.id.toString());
      setProductForm((prev) => ({ ...prev, category: newCat.id.toString() }));
      setCategoryName('');
      setCategoryDesc('');
      setCategorySuccess(`Category "${newCat.name}" added successfully!`);
      setTimeout(() => {
        setCategorySuccess(null);
        setIsAddCategoryOpen(false);
      }, 1000);
    } catch (err: any) {
      setCategoryError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingItem(true);
    try {
      const catName = categoryToDelete.name;
      const catId = categoryToDelete.id;
      await api.deleteSupplementCategory(catId);
      const updatedCats = await api.getSupplementCategories();
      setCategories(updatedCats);
      if (selectedCategory === catId.toString()) {
        setSelectedCategory('ALL');
      }
      setCategoryToDelete(null);
      setIsAddCategoryOpen(false);
      loadData();
      setToast({
        message: `Category "${catName}" was successfully deleted.`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.detail || 'Failed to delete category.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handlePrintPastReceipt = async (saleId: number, paymentId?: number) => {
    try {
      const receipt = await api.getSupplementReceipt(saleId, paymentId);
      setActiveReceipt(receipt);
    } catch (err) {
      setToast({
        message: 'Failed to load receipt details.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleOpenCollectDue = (sale: SupplementSale) => {
    setCollectTargetSale(sale);
    setCollectAmount(Number(sale.pending_amount).toString());
    setCollectDate(getTodayDateString());
    setCollectMethod('UPI');
    setCollectNotes('');
    setCollectError(null);
    setIsCollectModalOpen(true);
  };

  const handleConfirmCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectTargetSale) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setCollectError('Please enter a valid payment amount greater than 0.');
      return;
    }
    if (amt > Number(collectTargetSale.pending_amount)) {
      setCollectError(`Payment cannot exceed outstanding due of ₹${Number(collectTargetSale.pending_amount).toLocaleString('en-IN')}`);
      return;
    }

    setIsSubmittingCollect(true);
    setCollectError(null);
    try {
      const res = await api.collectSupplementDue(collectTargetSale.id, {
        amount: amt,
        payment_method: collectMethod,
        payment_date: collectDate,
        notes: collectNotes.trim() || undefined,
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }

      setIsCollectModalOpen(false);
      const targetSaleId = collectTargetSale.id;
      const targetInvoice = collectTargetSale.invoice_number;
      setCollectTargetSale(null);

      await loadData();

      if (res && res.receipt) {
        setActiveReceipt(res.receipt);
      } else {
        const updatedReceipt = await api.getSupplementReceipt(targetSaleId);
        setActiveReceipt(updatedReceipt);
      }

      setToast({
        message: `₹${amt.toLocaleString('en-IN')} payment recorded for Invoice #${targetInvoice} on ${collectDate}!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setCollectError(err.response?.data?.error || err.response?.data?.detail || 'Failed to collect due amount.');
    } finally {
      setIsSubmittingCollect(false);
    }
  };

  const handleOpenEditProduct = (p: SupplementProduct) => {
    setEditingProductId(p.id);
    setEditProductForm({
      name: p.name,
      brand: p.brand || '',
      category: p.category ? p.category.toString() : '',
      flavor: p.flavor || '',
      weight_or_servings: p.weight_or_servings || '',
      cost_price: p.cost_price.toString(),
      selling_price: p.selling_price.toString(),
      stock_quantity: p.stock_quantity.toString(),
      min_stock_alert: p.min_stock_alert.toString(),
    });
    setEditError(null);
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const payload: any = {
        name: editProductForm.name.trim(),
        brand: editProductForm.brand.trim(),
        flavor: editProductForm.flavor.trim(),
        weight_or_servings: editProductForm.weight_or_servings.trim(),
        cost_price: parseFloat(editProductForm.cost_price) || 0,
        selling_price: parseFloat(editProductForm.selling_price) || 0,
        stock_quantity: parseInt(editProductForm.stock_quantity) || 0,
        min_stock_alert: parseInt(editProductForm.min_stock_alert) || 3,
      };
      if (editProductForm.category) {
        payload.category = parseInt(editProductForm.category);
      } else {
        payload.category = null;
      }
      await api.updateSupplementProduct(editingProductId, payload);
      setIsEditProductOpen(false);
      loadData();
      setToast({
        message: `Product "${payload.name}" was successfully updated!`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Failed to update product details.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingItem(true);
    try {
      const prodName = productToDelete.name;
      await api.deleteSupplementProduct(productToDelete.id);
      setProductToDelete(null);
      loadData();
      setToast({
        message: `Product "${prodName}" was successfully deleted.`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.detail || 'Failed to delete product.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-heading tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-orange-600" />
            <span>Supplements & Store</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage gym supplement inventory, nutrition sales, and instant billing invoices for Morya Fitness.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setCategoryError(null);
              setCategorySuccess(null);
              setIsAddCategoryOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
          >
            <Plus className="w-4 h-4 text-orange-600" />
            <span>Add Category</span>
          </button>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-200"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>Add Product</span>
          </button>

          <button
            onClick={() => {
              resetSaleForm();
              setIsNewSaleOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New Sale / Billing</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Products */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Catalog</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {summary?.total_products || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Products in Store</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Est. Stock Value: ₹{(summary?.total_retail_valuation || 0).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Today's Sales */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Sales</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 font-heading">
              ₹{(summary?.today_sales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Direct supplement counter sales</p>
        </div>

        {/* Total Sales */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-orange-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-orange-600 font-heading">
              ₹{(summary?.total_sales ?? summary?.lifetime_sales ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">All-time supplement sales collected</p>
        </div>

        {/* Total Profit */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-200/90 bg-emerald-50/20 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 font-heading">
              ₹{(summary?.total_profit || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 font-semibold">
            This Month: ₹{(summary?.month_profit || 0).toLocaleString('en-IN')} • {summary?.profit_margin ?? 0}% Margin
          </p>
        </div>

        {/* Pending Dues */}
        <div
          onClick={() => setActiveTab('pending_dues')}
          className={`glass-panel p-5 rounded-3xl border shadow-sm space-y-2 cursor-pointer transition-all ${
            (summary?.total_pending_dues || 0) > 0
              ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-rose-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Dues</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-heading ${
              (summary?.total_pending_dues || 0) > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}>
              ₹{(summary?.total_pending_dues || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {summary?.pending_dues_count || pendingDues.length || 0} unpaid / partial invoices
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => {
            setActiveTab('inventory');
            setShowLowStockOnly(true);
          }}
          className={`glass-panel p-5 rounded-3xl border shadow-sm space-y-2 cursor-pointer transition-all ${(summary?.low_stock_count || 0) > 0
              ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50'
              : 'border-slate-200'
            }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${(summary?.low_stock_count || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-heading ${(summary?.low_stock_count || 0) > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {summary?.low_stock_count || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Low Stock Items</span>
          </div>
          <p className="text-[10px] text-slate-400">Click to filter replenishment items</p>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 text-xs font-bold font-heading uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'inventory'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>Store Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-4 text-xs font-bold font-heading uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'sales'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sales History & Receipts ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending_dues')}
            className={`pb-4 text-xs font-bold font-heading uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'pending_dues'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pending Dues ({pendingDues.length})</span>
            {pendingDues.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-700 rounded-full animate-pulse">
                {pendingDues.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Store Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by product name, brand, flavor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap border ${showLowStockOnly
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Low Stock Only</span>
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Product & Brand</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Flavor / Size</th>
                    <th className="p-3.5 text-right">Cost (₹)</th>
                    <th className="p-3.5 text-right">Selling MRP (₹)</th>
                    <th className="p-3.5 text-right">Unit Profit (₹)</th>
                    <th className="p-3.5 text-center">Available Stock</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold">No supplement products found.</p>
                        <p className="text-[11px] mt-0.5">Click "Add Product" above to populate your inventory.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock_quantity <= p.min_stock_alert;
                      const isOut = p.stock_quantity === 0;
                      const unitProfit = Math.max(0, Number(p.selling_price) - Number(p.cost_price));
                      const marginPct = Number(p.selling_price) > 0 ? Math.round((unitProfit / Number(p.selling_price)) * 100) : 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block text-sm">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{p.brand}</span>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                              {p.category_name || 'General'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="text-slate-800 font-medium block">{p.flavor || 'Unflavored'}</span>
                            <span className="text-[10px] text-slate-400">{p.weight_or_servings}</span>
                          </td>

                          <td className="p-3.5 text-right font-mono text-slate-500">
                            ₹{Number(p.cost_price).toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                            ₹{Number(p.selling_price).toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5 text-right font-mono">
                            <span className="font-bold text-emerald-600 block text-xs">
                              +₹{unitProfit.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {marginPct}% margin
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-1 rounded-full font-black text-[11px] border ${isOut
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : isLow
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                              >
                                {p.stock_quantity} units
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setSelectedProductForRestock(p);
                                  setRestockQty('5');
                                  setRestockCost(p.cost_price.toString());
                                  setIsRestockOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] border border-orange-200 transition-colors inline-flex items-center gap-1"
                                title="Restock Units"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                                <span>Restock</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors"
                                title="Edit Product Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setProductToDelete(p)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Sales History & Receipts */}
        {activeTab === 'sales' && (
          <div className="p-6 space-y-4">
            {/* Top Toolbar with Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
              <div>
                <h3 className="font-bold font-heading text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  <span>Supplement Payment Receipts</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological record of every supplement payment and dues settlement receipt.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt #, customer, item..."
                  value={salesSearchQuery}
                  onChange={(e) => setSalesSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Receipts Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Receipt #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Member / Customer</th>
                    <th className="p-3.5">Products / Items</th>
                    <th className="p-3.5">Method & Ref</th>
                    <th className="p-3.5 text-right">Amount Paid</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-800 text-sm">No supplement receipts found.</p>
                        <p className="text-[11px] mt-0.5 text-slate-500">
                          {salesSearchQuery
                            ? 'No receipts matched your search query.'
                            : 'Click "New Sale / Billing" to record purchases and generate receipts.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-orange-600 text-xs">
                          {p.receipt_number}
                        </td>

                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(p.payment_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{p.customer_name}</span>
                          {p.member_id && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {p.member_id}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <span className="text-slate-700 font-medium block truncate">
                            {p.items_summary || 'Supplements'}
                          </span>
                          {p.is_dues_payment && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                              Dues Settlement
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800 block">{p.payment_method}</span>
                          {p.notes && (
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[150px]">
                              {p.notes}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-emerald-600 text-sm">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handlePrintPastReceipt(p.sale, p.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ml-auto"
                          >
                            <Printer className="w-3.5 h-3.5 text-orange-600" />
                            <span>View & Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Pending Dues */}
        {activeTab === 'pending_dues' && (
          <div className="p-6 space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-50/60 border border-rose-200/80 p-4 rounded-2xl">
              <div>
                <h3 className="font-bold font-heading text-slate-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  <span>Supplement Pending Accounts</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track and collect outstanding dues for supplement sales. Receipts update instantly upon settlement.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, phone, invoice..."
                  value={duesSearchQuery}
                  onChange={(e) => setDuesSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-rose-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            {/* Dues Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Sale Date</th>
                    <th className="p-3.5">Customer / Member</th>
                    <th className="p-3.5">Products Purchased</th>
                    <th className="p-3.5 text-right">Net Bill</th>
                    <th className="p-3.5 text-right">Amount Paid</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingDues
                    .filter((d) => {
                      if (!duesSearchQuery.trim()) return true;
                      const q = duesSearchQuery.toLowerCase().trim();
                      return (
                        d.invoice_number?.toLowerCase().includes(q) ||
                        d.customer_name?.toLowerCase().includes(q) ||
                        d.customer_phone?.toLowerCase().includes(q) ||
                        d.member_code?.toLowerCase().includes(q)
                      );
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                        <p className="font-bold text-slate-800 text-sm">No Pending Dues!</p>
                        <p className="text-[11px] mt-0.5 text-slate-500">
                          {duesSearchQuery
                            ? 'No supplement dues matched your search filter.'
                            : 'All supplement customer balances are fully settled.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pendingDues
                      .filter((d) => {
                        if (!duesSearchQuery.trim()) return true;
                        const q = duesSearchQuery.toLowerCase().trim();
                        return (
                          d.invoice_number?.toLowerCase().includes(q) ||
                          d.customer_name?.toLowerCase().includes(q) ||
                          d.customer_phone?.toLowerCase().includes(q) ||
                          d.member_code?.toLowerCase().includes(q)
                        );
                      })
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900 text-xs">
                            {d.invoice_number}
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {new Date(d.sale_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{d.customer_name}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {d.member_code && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono font-bold">
                                  {d.member_code}
                                </span>
                              )}
                              <span>{d.customer_phone || 'Walk-in'}</span>
                            </span>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <span className="text-slate-700 font-medium truncate block">
                              {d.items?.map((it) => `${it.product_name} (${it.quantity})`).join(', ') || 'Supplements'}
                            </span>
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                            ₹{Number(d.final_amount).toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700 text-sm">
                            ₹{Number(d.paid_amount).toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5 text-right font-mono font-black text-rose-600 text-sm">
                            ₹{Number(d.pending_amount).toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              Number(d.paid_amount) > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {Number(d.paid_amount) > 0 ? 'PARTIAL' : 'PENDING'}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleOpenCollectDue(d)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all inline-flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Collect Due</span>
                              </button>

                              <button
                                onClick={() => handlePrintPastReceipt(d.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition-colors inline-flex items-center gap-1"
                                title="View Receipt"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: New Supplement POS Sale / Billing */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">New Supplement Billing (POS)</h3>
              </div>
              <button
                onClick={() => setIsNewSaleOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {saleError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{saleError}</span>
                  </div>
                )}

                {/* Customer Type Selector */}
                <div className="space-y-2">
                  <label className="block text-slate-700 font-bold">Select Customer</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCustomerType('member')}
                      className={`flex-1 py-2.5 rounded-xl font-bold border transition-all text-center ${customerType === 'member'
                          ? 'bg-orange-50 border-orange-500 text-orange-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                    >
                      Gym Enrolled Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('walk_in')}
                      className={`flex-1 py-2.5 rounded-xl font-bold border transition-all text-center ${customerType === 'walk_in'
                          ? 'bg-orange-50 border-orange-500 text-orange-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                    >
                      Walk-in Customer
                    </button>
                  </div>
                </div>

                {customerType === 'member' ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Select Member <span className="text-rose-600">*</span>
                    </label>
                    <SearchableSelect
                      options={memberSelectOptions}
                      value={selectedMemberId}
                      onChange={(val) => setSelectedMemberId(String(val))}
                      placeholder="-- Search or Choose Member from Registry --"
                      searchPlaceholder="Search member name, phone (+91), or Member ID..."
                      required
                      clearable
                      onClear={() => setSelectedMemberId('')}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Customer Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Patil"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Phone Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 9822012345"
                        value={walkInPhone}
                        onChange={(e) => setWalkInPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Product Items Cart Builder */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      Products & Quantities
                    </label>
                    <button
                      type="button"
                      onClick={() => setSaleItems([...saleItems, { productId: 0, quantity: 1 }])}
                      className="text-orange-600 hover:text-orange-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Item</span>
                    </button>
                  </div>

                  {/* Quick Search & Add Product Bar */}
                  <div className="p-2.5 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                    <label className="block text-[10px] uppercase font-bold text-orange-900 mb-1">
                      + Quick Search & Add Product to Cart
                    </label>
                    <SearchableSelect
                      options={productSelectOptions}
                      value=""
                      onChange={(val) => {
                        const prodId = Number(val);
                        if (!prodId) return;
                        const existingIndex = saleItems.findIndex((x) => x.productId === prodId);
                        if (existingIndex > -1) {
                          const newItems = [...saleItems];
                          newItems[existingIndex].quantity += 1;
                          setSaleItems(newItems);
                        } else if (saleItems.length === 1 && saleItems[0].productId === 0) {
                          setSaleItems([{ productId: prodId, quantity: 1 }]);
                        } else {
                          setSaleItems([...saleItems, { productId: prodId, quantity: 1 }]);
                        }
                      }}
                      placeholder="Search product name, brand, flavor, or barcode to add..."
                      searchPlaceholder="Type product name, brand, flavor, or barcode..."
                      size="sm"
                    />
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto p-1">
                    {saleItems.map((item, index) => {
                      const chosenProduct = products.find((p) => p.id === item.productId);

                      return (
                        <div key={index} className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="flex-1">
                            <SearchableSelect
                              options={productSelectOptions}
                              value={item.productId || ''}
                              onChange={(val) => {
                                const newItems = [...saleItems];
                                newItems[index].productId = Number(val) || 0;
                                setSaleItems(newItems);
                              }}
                              placeholder="-- Select Supplement Product --"
                              searchPlaceholder="Search product by name, brand, flavor..."
                              required
                            />
                          </div>

                          <div className="w-20">
                            <input
                              type="number"
                              min="1"
                              max={chosenProduct ? chosenProduct.stock_quantity : 99}
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...saleItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setSaleItems(newItems);
                              }}
                              className="w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs text-center focus:outline-none focus:border-orange-500 font-bold"
                              required
                            />
                          </div>

                          <div className="w-24 text-right font-mono font-bold text-slate-900 text-xs">
                            ₹{chosenProduct ? (Number(chosenProduct.selling_price) * item.quantity).toLocaleString('en-IN') : '0'}
                          </div>

                          {saleItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSaleItems(saleItems.filter((_, i) => i !== index));
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sale Date, Payment, Discount & Amount Paid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Sale Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-xs"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="NET_BANKING">Net Banking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Discount Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Amount Paid Now (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={calculateFinalTotal()}
                      value={paidAmount}
                      onChange={(e) => {
                        setPaidAmount(e.target.value);
                        setIsPaidAmountManuallyEdited(true);
                      }}
                      placeholder={calculateFinalTotal().toString()}
                      className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 font-bold text-xs shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="e.g. Complimentary shaker provided, special discount..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>

                {/* Grand Total Summary Box */}
                {(() => {
                  const finalTotal = calculateFinalTotal();
                  const effectivePaid = paidAmount === '' ? finalTotal : Math.min(finalTotal, Math.max(0, parseFloat(paidAmount) || 0));
                  const due = Math.max(0, finalTotal - effectivePaid);

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Net Bill Amount</span>
                          <span className="text-xl font-black text-slate-900 font-heading">
                            ₹{finalTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-right text-[11px] text-slate-500">
                          Gross: ₹{calculateGrossTotal().toLocaleString('en-IN')}
                          {parseFloat(discountAmount) > 0 && (
                            <span className="block text-orange-600 font-semibold">
                              Discount: -₹{parseFloat(discountAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-medium">Paying Now:</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            ₹{effectivePaid.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-medium">Balance Due:</span>
                          <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg border ${
                            due > 0
                              ? 'text-rose-600 bg-rose-50 border-rose-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}>
                            ₹{due.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSale}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmittingSale ? (
                    <span>Processing Sale...</span>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Complete Sale & Print Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Supplement Product */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Add New Supplement Product</h3>
              </div>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gold Standard 100% Whey Protein"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Brand</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Optimum Nutrition"
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Category</label>
                    <SearchableSelect
                      options={categorySelectOptions}
                      value={productForm.category}
                      onChange={(val) => setProductForm({ ...productForm, category: String(val) })}
                      placeholder="-- General Category --"
                      searchPlaceholder="Search category name..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Flavor</label>
                    <input
                      type="text"
                      placeholder="e.g. Double Rich Chocolate"
                      value={productForm.flavor}
                      onChange={(e) => setProductForm({ ...productForm, flavor: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Weight / Servings</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 kg / 60 servings"
                      value={productForm.weight_or_servings}
                      onChange={(e) => setProductForm({ ...productForm, weight_or_servings: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cost / Purchase Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 4500"
                      value={productForm.cost_price}
                      onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Selling / MRP Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 5800"
                      value={productForm.selling_price}
                      onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-orange-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Initial Stock Units</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Low-Stock Alert Level</label>
                    <input
                      type="number"
                      min="1"
                      value={productForm.min_stock_alert}
                      onChange={(e) => setProductForm({ ...productForm, min_stock_alert: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md shadow-orange-500/20 transition-all"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Supplement Product */}
      {isEditProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Edit Supplement Product</h3>
              </div>
              <button
                onClick={() => setIsEditProductOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Brand</label>
                    <input
                      type="text"
                      required
                      value={editProductForm.brand}
                      onChange={(e) => setEditProductForm({ ...editProductForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Category</label>
                    <SearchableSelect
                      options={categorySelectOptions}
                      value={editProductForm.category}
                      onChange={(val) => setEditProductForm({ ...editProductForm, category: String(val) })}
                      placeholder="-- General Category --"
                      searchPlaceholder="Search category name..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Flavor</label>
                    <input
                      type="text"
                      placeholder="e.g. Double Rich Chocolate"
                      value={editProductForm.flavor}
                      onChange={(e) => setEditProductForm({ ...editProductForm, flavor: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Weight / Servings</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 kg / 30 servings"
                      value={editProductForm.weight_or_servings}
                      onChange={(e) => setEditProductForm({ ...editProductForm, weight_or_servings: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editProductForm.cost_price}
                      onChange={(e) => setEditProductForm({ ...editProductForm, cost_price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Selling Price / MRP (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editProductForm.selling_price}
                      onChange={(e) => setEditProductForm({ ...editProductForm, selling_price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-orange-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Current Stock Units</label>
                    <input
                      type="number"
                      min="0"
                      value={editProductForm.stock_quantity}
                      onChange={(e) => setEditProductForm({ ...editProductForm, stock_quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Low-Stock Alert Level</label>
                    <input
                      type="number"
                      min="1"
                      value={editProductForm.min_stock_alert}
                      onChange={(e) => setEditProductForm({ ...editProductForm, min_stock_alert: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditProductOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving Changes...' : 'Save Product Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Restock Inventory */}
      {isRestockOpen && selectedProductForRestock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Restock Product Inventory</h3>
              </div>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                <span className="font-bold text-slate-900 block text-sm">{selectedProductForRestock.name}</span>
                <p className="text-slate-500 text-[11px]">
                  Current Available Stock: <strong className="text-slate-900">{selectedProductForRestock.stock_quantity} units</strong>
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Units to Add to Stock</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-black text-sm text-center"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Updated Cost / Purchase Price (₹, optional)</label>
                <input
                  type="number"
                  min="0"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  placeholder={selectedProductForRestock.cost_price.toString()}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md shadow-orange-500/20 transition-all"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Manage & Add Supplement Category */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Manage Categories</h3>
              </div>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Add New Category
                </h4>

                {categoryError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {categoryError}
                  </div>
                )}

                {categorySuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{categorySuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Category Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Creatine, Pre-Workout, Whey Protein..."
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Short description or notes..."
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingCategory || !categoryName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingCategory ? 'Adding...' : 'Add Category'}</span>
                  </button>
                </div>
              </form>

              {/* Current Categories List */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    Current Categories ({categories.length})
                  </h4>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 text-xs block truncate">{c.name}</span>
                        {c.description && (
                          <span className="text-[10px] text-slate-400 block truncate">{c.description}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                          {c.products_count || 0} prods
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete({ id: c.id, name: c.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {categories.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No categories added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Collect Supplement Balance Due"
        subtitle={collectTargetSale ? `Invoice #${collectTargetSale.invoice_number} • ${collectTargetSale.customer_name}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCollectDue} className="space-y-4 text-xs">
          {collectError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{collectError}</span>
            </div>
          )}

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Bill Amount:</span>
              <span className="font-bold text-slate-900">
                ₹{Number(collectTargetSale?.final_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Already Paid:</span>
              <span className="font-bold text-emerald-700">
                ₹{Number(collectTargetSale?.paid_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
              <span className="font-bold text-slate-800">Remaining Balance Due:</span>
              <span className="font-black text-rose-600 text-base font-mono">
                ₹{Number(collectTargetSale?.pending_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Payment Amount to Collect (₹) <span className="text-slate-400 font-normal">(Can be partial or full)</span>
            </label>
            <input
              type="number"
              min="1"
              max={collectTargetSale ? Number(collectTargetSale.pending_amount) : 99999}
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-orange-400 rounded-xl text-slate-900 font-black text-base font-mono focus:outline-none focus:border-orange-500 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
              <input
                type="date"
                value={collectDate}
                onChange={(e) => setCollectDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-xs cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
              <select
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold text-xs"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="NET_BANKING">Net Banking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Payment Notes / Ref No. (Optional)</label>
            <input
              type="text"
              value={collectNotes}
              onChange={(e) => setCollectNotes(e.target.value)}
              placeholder="e.g. GPay / UTR / Cash at front desk"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCollectModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCollect || !collectAmount}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isSubmittingCollect ? 'Processing Payment...' : 'Record Payment & Print Receipt'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <SupplementReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Product Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Confirm Product Deletion"
        subtitle="Action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>Are you sure you want to delete this product?</span>
            </div>
            <p className="text-[11px] text-rose-700 pl-7">
              This will permanently remove <strong>{productToDelete?.name}</strong> ({productToDelete?.brand}) from the inventory catalog. Historical sales invoices will retain their line item descriptions.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setProductToDelete(null)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteProduct}
              disabled={isDeletingItem}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              {isDeletingItem ? 'Deleting...' : 'Yes, Delete Product'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Delete Confirmation Modal */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        title="Confirm Category Deletion"
        subtitle="Action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>Are you sure you want to delete this category?</span>
            </div>
            <p className="text-[11px] text-rose-700 pl-7">
              This will remove category <strong>{categoryToDelete?.name}</strong>. Products in this category will remain, but will be uncategorized.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCategoryToDelete(null)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteCategory}
              disabled={isDeletingItem}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 disabled:opacity-50"
            >
              {isDeletingItem ? 'Deleting...' : 'Yes, Delete Category'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-rose-600 text-white border-rose-700'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
