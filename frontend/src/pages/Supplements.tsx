import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Search, Filter, AlertTriangle,
  CheckCircle2, PackagePlus, RefreshCw, Printer,
  TrendingUp, DollarSign, Layers, ArrowUpDown, X,
  Trash2, Edit3, UserCheck, CreditCard, Sparkles,
  ChevronRight, ArrowRight, ShieldAlert, Check
} from 'lucide-react';
import {
  SupplementCategory, SupplementProduct, SupplementSale,
  SupplementSummary, Member, SupplementReceiptData
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { SupplementReceiptModal } from '../components/receipts/SupplementReceiptModal';

export const Supplements: React.FC = () => {
  // Data States
  const [products, setProducts] = useState<SupplementProduct[]>([]);
  const [categories, setCategories] = useState<SupplementCategory[]>([]);
  const [sales, setSales] = useState<SupplementSale[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<SupplementSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales'>('inventory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState<boolean>(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<SupplementProduct | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<SupplementReceiptData | null>(null);

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

  // Form States: Restock
  const [restockQty, setRestockQty] = useState<string>('5');
  const [restockCost, setRestockCost] = useState<string>('');

  // Form States: New Sale (POS)
  const [customerType, setCustomerType] = useState<'member' | 'walk_in'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [saleItems, setSaleItems] = useState<{ productId: number; quantity: number }[]>([
    { productId: 0, quantity: 1 }
  ]);
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodData, catData, salesData, summaryData, membersData] = await Promise.all([
        api.getSupplementProducts(),
        api.getSupplementCategories(),
        api.getSupplementSales(),
        api.getSupplementSummary(),
        api.getMembers(),
      ]);
      setProducts(prodData);
      setCategories(catData);
      setSales(salesData);
      setSummary(summaryData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load supplements data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create product.');
    }
  };

  // Handle Restock Submit
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRestock) return;
    try {
      const qty = parseInt(restockQty) || 0;
      const cost = restockCost ? parseFloat(restockCost) : undefined;
      await api.restockSupplementProduct(selectedProductForRestock.id, qty, cost);
      setIsRestockOpen(false);
      setSelectedProductForRestock(null);
      setRestockQty('5');
      setRestockCost('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to restock product.');
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

    setIsSubmittingSale(true);
    try {
      const payload = {
        member: memberIdVal,
        customer_name: custName,
        customer_phone: custPhone,
        discount: parseFloat(discountAmount) || 0,
        payment_method: paymentMethod,
        notes: saleNotes,
        items: validItems.map((it) => ({
          product: it.productId,
          quantity: it.quantity,
        })),
      };

      const createdSale = await api.createSupplementSale(payload);
      const receiptData = await api.getSupplementReceipt(createdSale.id);

      setIsNewSaleOpen(false);
      resetSaleForm();
      loadData();
      setActiveReceipt(receiptData);
    } catch (err: any) {
      setSaleError(err.response?.data?.items || err.response?.data?.detail || 'Failed to record sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const resetSaleForm = () => {
    setCustomerType('member');
    setSelectedMemberId('');
    setWalkInName('');
    setWalkInPhone('');
    setSaleItems([{ productId: 0, quantity: 1 }]);
    setDiscountAmount('0');
    setPaymentMethod('UPI');
    setSaleNotes('');
    setSaleError(null);
  };

  const handlePrintPastReceipt = async (saleId: number) => {
    try {
      const receipt = await api.getSupplementReceipt(saleId);
      setActiveReceipt(receipt);
    } catch (err) {
      alert('Failed to load receipt details.');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Monthly Revenue */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-orange-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Revenue</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-orange-600 font-heading">
              ₹{(summary?.monthly_sales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">This month's nutrition collection</p>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => {
            setActiveTab('inventory');
            setShowLowStockOnly(true);
          }}
          className={`glass-panel p-5 rounded-3xl border shadow-sm space-y-2 cursor-pointer transition-all ${
            (summary?.low_stock_count || 0) > 0
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
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 text-xs font-bold font-heading uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Store Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-4 text-xs font-bold font-heading uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'sales'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sales History & Invoices ({sales.length})</span>
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
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-orange-500"
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
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap border ${
                    showLowStockOnly
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
                    <th className="p-3.5 text-center">Available Stock</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold">No supplement products found.</p>
                        <p className="text-[11px] mt-0.5">Click "Add Product" above to populate your inventory.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock_quantity <= p.min_stock_alert;
                      const isOut = p.stock_quantity === 0;

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

                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-1 rounded-full font-black text-[11px] border ${
                                  isOut
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
                            <button
                              onClick={() => {
                                setSelectedProductForRestock(p);
                                setRestockQty('5');
                                setRestockCost(p.cost_price.toString());
                                setIsRestockOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] border border-orange-200 transition-colors inline-flex items-center gap-1.5"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>
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

        {/* Tab 2: Sales History & Invoices */}
        {activeTab === 'sales' && (
          <div className="p-6 space-y-4">
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Items Purchased</th>
                    <th className="p-3.5 text-right">Final Amount</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold">No supplement sales recorded yet.</p>
                        <p className="text-[11px] mt-0.5">Click "New Sale / Billing" to generate your first invoice.</p>
                      </td>
                    </tr>
                  ) : (
                    sales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900 text-xs">
                          {s.invoice_number}
                        </td>

                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(s.sale_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{s.customer_name}</span>
                          <span className="text-[10px] text-slate-400">{s.customer_phone || 'Walk-in'}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="text-slate-700 font-medium">
                            {s.items?.map((it) => `${it.product_name} (${it.quantity})`).join(', ') || 'Supplements'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                          ₹{Number(s.final_amount).toLocaleString('en-IN')}
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                            {s.payment_method_display || s.payment_method}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handlePrintPastReceipt(s.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Print</span>
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
      </div>

      {/* MODAL 1: New Supplement POS Sale / Billing */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
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

            <form onSubmit={handleCreateSale} className="p-6 space-y-5 text-xs">
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
                    className={`flex-1 py-2.5 rounded-xl font-bold border transition-all text-center ${
                      customerType === 'member'
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Gym Enrolled Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('walk_in')}
                    className={`flex-1 py-2.5 rounded-xl font-bold border transition-all text-center ${
                      customerType === 'walk_in'
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
                  <label className="block text-slate-700 font-bold mb-1">Select Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">-- Choose Member from Registry --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id.toString()}>
                        {m.full_name} ({m.member_id}) - {m.phone}
                      </option>
                    ))}
                  </select>
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

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {saleItems.map((item, index) => {
                    const chosenProduct = products.find((p) => p.id === item.productId);

                    return (
                      <div key={index} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex-1">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const newItems = [...saleItems];
                              newItems[index].productId = parseInt(e.target.value) || 0;
                              setSaleItems(newItems);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-orange-500"
                            required
                          >
                            <option value={0}>-- Select Supplement Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                                {p.name} ({p.brand}) - ₹{Number(p.selling_price).toLocaleString('en-IN')} [Stock: {p.stock_quantity}]
                              </option>
                            ))}
                          </select>
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
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs text-center focus:outline-none focus:border-orange-500 font-bold"
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

              {/* Payment & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>
              </div>

              {/* Grand Total Summary Box */}
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-orange-700 font-bold uppercase block">Net Amount to Collect</span>
                  <span className="text-xl font-black text-slate-900 font-heading">
                    ₹{calculateFinalTotal().toLocaleString('en-IN')}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
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

            <form onSubmit={handleAddProduct} className="p-6 space-y-4 text-xs">
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
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- General Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
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

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <SupplementReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
