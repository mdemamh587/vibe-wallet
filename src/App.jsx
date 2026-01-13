import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, ref, push, onValue } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { remove, set } from 'firebase/database';
import { ShoppingCart, ArrowLeftRight, Users, Plus, Home, LogOut, CheckCircle2, Zap, Moon, Sun, Calendar as CalendarIcon, Bell, Info, Download, User, Edit2, Save, X, Camera, BarChart3, Phone, Mail, Globe, DollarSign, FileText, Trash2, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import * as XLSX from 'xlsx';


function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(true);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('Cash'); 
  const [category, setCategory] = useState('যাতায়াত');
  const [expenses, setExpenses] = useState([]);
  const [wallets, setWallets] = useState({ Cash: 0, Nagad: 0, Upay: 0 });
  const [shoppingList, setShoppingList] = useState([]);
  // 🔔 Shopping Reminder Alert States
const [showAlert, setShowAlert] = useState(false);
const [todayReminders, setTodayReminders] = useState([]);
// Mark Shopping Item as Done from Alert
const markShopAsDone = (id) => {
  set(ref(db, `shopping/${user.uid}/${id}/done`), true);
  setTodayReminders(prev => prev.filter(item => item.id !== id));
  if (todayReminders.length === 1) {
    setShowAlert(false);
  }
};
  const [shopItem, setShopItem] = useState('');
  const [shopPriority, setShopPriority] = useState('Normal'); 
  const [debts, setDebts] = useState([]);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('Obtain Money');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Profile Section States
  const [userData, setUserData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    joinedDate: new Date().toISOString().split('T')[0],
    language: 'Bangla',
    currency: 'BDT (৳)',
    photoURL: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [tempData, setTempData] = useState({ ...userData });
  const [saving, setSaving] = useState(false);

  // Download Excel function
  const downloadExcel = () => {
    if (expenses.length === 0) { alert("কোনো ডাটা নেই!"); return; }
    const data = expenses.map(e => ({
      Date: new Date(e.createdAt).toLocaleDateString(),
      Description: e.text,
      Amount: e.amount,
      Category: e.category,
      Wallet: e.wallet
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "VibeWallet_Backup.xlsx");
  };

// 🔔 Sound Alert Function
const playAlertSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const playBeep = (freq, time) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + time);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + time + 0.5
    );

    oscillator.start(audioContext.currentTime + time);
    oscillator.stop(audioContext.currentTime + time + 0.5);
  };

  playBeep(800, 0);
  playBeep(1000, 0.6);
  playBeep(1200, 1.2);
};
// 📳 Vibration Function
const triggerVibration = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
};

// ⏰ Check Today's Shopping Reminders
const checkTodayReminders = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const reminders = shoppingList.filter(item => {
    if (item.done || !item.remindDate) return false;

    const itemDate = item.remindDate.split('T')[0];
    if (itemDate !== today) return false;

    // If time is set, check time
    if (item.remindTime) {
      return item.remindTime <= currentTime;
    }

    return true; // all-day reminder
  });

  if (reminders.length > 0) {
    setTodayReminders(reminders);
    setShowAlert(true);
    playAlertSound();
    triggerVibration();
  }
};



  const categories = [
    { name: 'যাতায়াত', icon: '🚌', color: '#6366f1' }, 
    { name: 'পড়াশোনা', icon: '📚', color: '#10b981' },
    { name: 'পান', icon: '☕', color: '#f59e0b' }, 
    { name: 'নাস্তা', icon: '🥘', color: '#ef4444' },
    { name: 'দান', icon: '🤲', color: '#8b5cf6' }, 
    { name: 'জমা', icon: '🏦', color: '#ec4899' },
    { name: 'শখ', icon: '🎨', color: '#06b6d4' }, 
    { name: 'বিপদ', icon: '🆘', color: '#f43f5e' },
    { name: 'বাসা', icon: '🏠', color: '#f97316' }, 
    { name: 'ঘুরা', icon: '🏞️', color: '#84cc16' },
    { name: 'গিফট', icon: '🎁', color: '#d946ef' }, 
    { name: 'কোচিং', icon: '🫠', color: '#64748b' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load expenses
        onValue(ref(db, 'expenses/' + currentUser.uid), (snapshot) => {
          const data = snapshot.val();
          setExpenses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
        });
        // Load wallets
        onValue(ref(db, 'wallets/' + currentUser.uid), (snapshot) => {
          if (snapshot.exists()) setWallets(snapshot.val());
        });
        // Load shopping list
onValue(ref(db, 'shopping/' + currentUser.uid), (snapshot) => {
  const data = snapshot.val();
  const list = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
  setShoppingList(list);
  // Check reminders whenever shopping list updates
  setTimeout(checkTodayReminders, 500);
});
// 🔁 Check reminders every 1 minute
useEffect(() => {
  if (user) {
    const interval = setInterval(checkTodayReminders, 60000);
    return () => clearInterval(interval);
  }
}, [user, shoppingList]);

        // Load debts
        onValue(ref(db, 'debts/' + currentUser.uid), (snapshot) => {
          const data = snapshot.val();
          setDebts(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
        });
        // Load user profile
        onValue(ref(db, 'users/' + currentUser.uid + '/profile'), (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
            setTempData(snapshot.val());
          } else {
            // Initialize default profile
            const defaultProfile = {
              fullName: currentUser.displayName || '',
              dateOfBirth: '',
              phone: '',
              joinedDate: new Date().toISOString().split('T')[0],
              language: 'Bangla',
              currency: 'BDT (৳)',
              photoURL: currentUser.photoURL || ''
            };
            setUserData(defaultProfile);
            setTempData(defaultProfile);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const dailyExpenses = expenses.filter(e => new Date(e.createdAt).toDateString() === selectedDate.toDateString());
  const dailyShops = shoppingList.filter(s => s.remindDate && new Date(s.remindDate).toDateString() === selectedDate.toDateString());

  const getTileContent = ({ date, view }) => {
    if (view === 'month') {
      const hasExp = expenses.some(e => new Date(e.createdAt).toDateString() === date.toDateString());
      const hasEvent = shoppingList.some(s => s.remindDate && new Date(s.remindDate).toDateString() === date.toDateString());
      return (
        <div className="flex justify-center gap-0.5 mt-1">
          {hasExp && <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></div>}
          {hasEvent && <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>}
        </div>
      );
    }
  };

  const getStats = (period) => {
    const now = new Date();
    return expenses.filter(exp => {
      const expDate = new Date(exp.createdAt);
      if (period === 'today') return expDate.toDateString() === now.toDateString();
      if (period === 'week') {
        const lastSat = new Date(now);
        lastSat.setDate(now.getDate() - ((now.getDay() + 1) % 7));
        lastSat.setHours(0,0,0,0);
        return expDate >= lastSat;
      }
      if (period === 'month') return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      return false;
    }).reduce((s, i) => s + i.amount, 0);
  };

  const pieData = categories.map(cat => ({
    name: cat.name,
    value: expenses.filter(e => e.category === cat.name).reduce((s, i) => s + i.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const totalBalance = (wallets.Cash || 0) + (wallets.Nagad || 0) + (wallets.Upay || 0);
  const totalObtain = debts.filter(d => d.type === 'Obtain Money').reduce((s, i) => s + i.amount, 0);
  const totalLoan = debts.filter(d => d.type === 'Loan').reduce((s, i) => s + i.amount, 0);

  const addExpense = (e) => {
    e.preventDefault();
    if (!text || !amount) return;
    const numAmount = parseFloat(amount);
    push(ref(db, 'expenses/' + user.uid), { text, amount: numAmount, wallet, category, createdAt: new Date().toISOString() });
    set(ref(db, 'wallets/' + user.uid), { ...wallets, [wallet]: (wallets[wallet] || 0) - numAmount });
    setText(''); setAmount('');
  };

  // Profile Functions
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await set(ref(db, 'users/' + user.uid + '/profile'), tempData);
      setUserData({ ...tempData });
      setEditMode(false);
      alert('✅ Profile updated successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setTempData({ ...userData });
    setEditMode(false);
  };

  const handlePhotoChange = () => {
    alert('Photo upload feature - will be implemented with Firebase Storage');
  };
// তোমার App.jsx এ এই functions যোগ করো

// Monthly/Weekly Report Generator Function
const generateReport = (type) => {
  const now = new Date();
  let startDate, endDate;
  
  if (type === 'weekly') {
    // Last 7 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    endDate = now;
  } else {
    // Current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  // Filter expenses for the period
  const periodExpenses = expenses.filter(e => {
    const expDate = new Date(e.createdAt);
    return expDate >= startDate && expDate <= endDate;
  });
  
  // Calculate totals
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Assume deposits in the period (you can track this in Firebase too)
  const totalIncome = 0; // Update this if you track deposits
  const netSavings = totalIncome - totalExpenses;
  
  // Category breakdown
  const categoryBreakdown = {};
  periodExpenses.forEach(e => {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
  });
  
  // Wallet distribution
  const walletDist = {};
  periodExpenses.forEach(e => {
    walletDist[e.wallet] = (walletDist[e.wallet] || 0) + e.amount;
  });
  
  // Top 5 expenses
  const topExpenses = [...periodExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Generate HTML for print
  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vibe Wallet - ${type === 'monthly' ? 'Monthly' : 'Weekly'} Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 40px; 
          background: #fff; 
          color: #000; 
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
          border-bottom: 4px solid #6366f1; 
          padding-bottom: 20px; 
        }
        .header h1 { 
          color: #6366f1; 
          font-size: 36px; 
          margin-bottom: 10px; 
          letter-spacing: 4px; 
          font-weight: 900;
        }
        .header .subtitle { 
          color: #666; 
          font-size: 18px; 
          font-weight: bold; 
          margin: 5px 0;
        }
        .header .date-range { 
          color: #999; 
          font-size: 14px; 
        }
        .summary { 
          display: grid; 
          grid-template-columns: 1fr 1fr 1fr; 
          gap: 20px; 
          margin: 40px 0; 
        }
        .summary-card { 
          border: 3px solid #e5e7eb; 
          border-radius: 16px; 
          padding: 25px; 
          text-align: center; 
        }
        .summary-card.income { 
          border-color: #10b981; 
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
        }
        .summary-card.expense { 
          border-color: #ef4444; 
          background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); 
        }
        .summary-card.savings { 
          border-color: #6366f1; 
          background: linear-gradient(135deg, #eef2ff 0%, #ddd6fe 100%); 
        }
        .summary-card h3 { 
          font-size: 11px; 
          text-transform: uppercase; 
          color: #666; 
          margin-bottom: 15px; 
          letter-spacing: 1px;
          font-weight: 900;
        }
        .summary-card .amount { 
          font-size: 32px; 
          font-weight: 900; 
          margin: 0; 
        }
        .summary-card.income .amount { color: #10b981; }
        .summary-card.expense .amount { color: #ef4444; }
        .summary-card.savings .amount { color: #6366f1; }
        .section { 
          margin: 40px 0; 
          page-break-inside: avoid;
        }
        .section h2 { 
          font-size: 20px; 
          color: #6366f1; 
          border-bottom: 3px solid #e5e7eb; 
          padding-bottom: 12px; 
          margin-bottom: 20px;
          font-weight: 900;
        }
        .breakdown { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-top: 20px; 
        }
        .breakdown-item { 
          display: flex; 
          justify-content: space-between; 
          padding: 15px; 
          background: #f9fafb; 
          border-radius: 10px; 
          border-left: 4px solid #6366f1;
        }
        .breakdown-item strong { color: #111; }
        .breakdown-item span { 
          color: #6366f1; 
          font-weight: bold; 
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px; 
        }
        .table th { 
          background: #6366f1; 
          color: white; 
          padding: 15px; 
          text-align: left; 
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .table td { 
          padding: 15px; 
          border-bottom: 2px solid #e5e7eb; 
          font-size: 14px;
        }
        .table tr:nth-child(even) { background: #f9fafb; }
        .table tr:hover { background: #f3f4f6; }
        .footer { 
          text-align: center; 
          margin-top: 60px; 
          padding-top: 30px; 
          border-top: 3px solid #e5e7eb; 
          color: #666; 
          font-size: 12px; 
        }
        .footer strong { color: #6366f1; }
        .no-data { 
          text-align: center; 
          padding: 40px; 
          color: #999; 
          font-style: italic; 
        }
        @media print {
          body { padding: 20px; }
          .summary { gap: 15px; }
          .section { margin: 30px 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⚡ VIBE WALLET</h1>
        <div class="subtitle">${type === 'monthly' ? 'MONTHLY' : 'WEEKLY'} FINANCIAL REPORT</div>
        <div class="date-range">
          Period: ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}
        </div>
        <div class="date-range">Generated on ${new Date().toLocaleString('en-GB')}</div>
      </div>

      <div class="summary">
        <div class="summary-card income">
          <h3>💰 Total Income</h3>
          <p class="amount">৳${totalIncome.toLocaleString()}</p>
        </div>
        <div class="summary-card expense">
          <h3>💸 Total Expenses</h3>
          <p class="amount">৳${totalExpenses.toLocaleString()}</p>
        </div>
        <div class="summary-card savings">
          <h3>💎 Net Savings</h3>
          <p class="amount">${netSavings >= 0 ? '+' : ''}৳${netSavings.toLocaleString()}</p>
        </div>
      </div>

      ${Object.keys(categoryBreakdown).length > 0 ? `
      <div class="section">
        <h2>📊 Category Breakdown</h2>
        <div class="breakdown">
          ${Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => `
              <div class="breakdown-item">
                <strong>${cat}</strong>
                <span>৳${amt.toLocaleString()}</span>
              </div>
            `).join('')}
        </div>
      </div>
      ` : '<div class="no-data">No category data available</div>'}

      ${topExpenses.length > 0 ? `
      <div class="section">
        <h2>🏆 Top 5 Biggest Expenses</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${topExpenses.map(e => `
              <tr>
                <td>${new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
                <td><strong>${e.text}</strong></td>
                <td>${e.category}</td>
                <td><strong>৳${e.amount.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${Object.keys(walletDist).length > 0 ? `
      <div class="section">
        <h2>💳 Wallet Distribution</h2>
        <div class="breakdown">
          ${Object.entries(walletDist)
            .sort((a, b) => b[1] - a[1])
            .map(([wallet, amt]) => `
              <div class="breakdown-item">
                <strong>${wallet}</strong>
                <span>৳${amt.toLocaleString()} (${((amt/totalExpenses)*100).toFixed(1)}%)</span>
              </div>
            `).join('')}
        </div>
      </div>
      ` : ''}

      ${periodExpenses.length > 0 ? `
      <div class="section">
        <h2>📝 All Transactions (${periodExpenses.length} total)</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Wallet</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${periodExpenses
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(e => `
                <tr>
                  <td>${new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>${e.text}</td>
                  <td>${e.category}</td>
                  <td>${e.wallet}</td>
                  <td><strong>৳${e.amount.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
      ` : '<div class="no-data">No transactions found in this period</div>'}

      <div class="footer">
        <p><strong>VIBE WALLET</strong> - Your Personal Finance Tracker</p>
        <p>This is an automated report generated by Vibe Wallet</p>
        <p>For support, contact: support@vibewallet.com</p>
      </div>
    </body>
    </html>
  `;
  
  // Open print dialog
  const printWindow = window.open('', '', 'height=800,width=800');
  printWindow.document.write(reportHTML);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    
    // Close after printing (optional)
    // printWindow.onafterprint = function() {
    //   printWindow.close();
    // };
  };
};

  const resetAllData = () => {
    if (window.confirm('⚠️ Are you sure? This will delete ALL your data permanently!')) {
      // Delete all user data
      set(ref(db, 'expenses/' + user.uid), null);
      set(ref(db, 'wallets/' + user.uid), null);
      set(ref(db, 'shopping/' + user.uid), null);
      set(ref(db, 'debts/' + user.uid), null);
      alert('✅ All data has been reset!');
    }
  };

  const themeClass = darkMode ? "bg-[#0B0E14] text-white" : "bg-[#F3F4F6] text-slate-900";
  const cardClass = darkMode ? "bg-[#161B22] border-gray-800" : "bg-white border-gray-200 shadow-sm";
  const inputClass = darkMode ? "bg-[#1C2128] border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-slate-900 placeholder:text-gray-400";

  return (
    <div className={`min-h-screen ${themeClass} font-sans transition-colors duration-300`}>
      <div className="max-w-md mx-auto p-4 pb-32 relative z-10">
        {/* 🔔 REMINDER ALERT POPUP */}
{showAlert && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div className="w-full max-w-md bg-gradient-to-br from-rose-500/20 to-orange-500/20 border-2 border-rose-500 rounded-[2rem] p-6 shadow-2xl animate-slideUp">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center animate-bounce">
            <Bell size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-rose-400">REMINDER ALERT!</h3>
            <p className="text-xs opacity-60">You have {todayReminders.length} task{todayReminders.length > 1 ? 's' : ''} today</p>
          </div>
        </div>
        <button onClick={() => setShowAlert(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {todayReminders.map(item => (
          <div key={item.id} className="bg-[#161B22] border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 hover:border-rose-500/50 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart size={16} className="text-rose-400" />
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                  item.priority === 'Urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                  item.priority === 'Normal' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>{item.priority}</span>
              </div>
              <p className="font-bold text-sm text-white">{item.text}</p>
              <p className="text-[10px] opacity-40 mt-1">
                📅 Today {item.remindTime && `• 🕒 ${item.remindTime}`}
              </p>
            </div>
            <button onClick={() => markShopAsDone(item.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-black transition-all active:scale-90 flex items-center gap-1">
              <CheckCircle2 size={14} />DONE
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-6">
        <button onClick={() => setShowAlert(false)} className="py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-black text-xs transition-all active:scale-95">CLOSE</button>
        <button onClick={() => { playAlertSound(); triggerVibration(); }} className="py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
          <Bell size={14} />REPLAY
        </button>
      </div>
    </div>
  </div>
)}
        {!user ? (
          <div className="mt-32 text-center p-8 border rounded-[2.5rem] bg-[#161B22] border-gray-800">
            <Zap className="text-indigo-500 mx-auto mb-4" size={50} fill="currentColor" />
            <h1 className="text-3xl font-black mb-6 italic tracking-tighter">VIBE WALLET</h1>
            <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-4 bg-white text-black text-xl font-bold rounded-2xl">Login with Google</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <img src={user.photoURL} className="w-10 h-10 rounded-xl border border-indigo-500" alt="profile" />
                <h2 className="font-black">Hi, {user.displayName ? user.displayName.split(' ')[0] : 'User'}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadExcel} className={`p-2 rounded-lg ${cardClass} border text-indigo-500`}>
                   <Download size={18}/>
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${cardClass} border`}>
                  {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
                </button>
                <button onClick={() => signOut(auth)} className={`p-2 rounded-lg ${cardClass} border text-red-500`}><LogOut size={18}/></button>
              </div>
            </div>

            {/* HOME TAB */}
            {activeTab === 'home' && (
              <div className="space-y-5">
                {/* Hero Balance Card - Enhanced */}
                <div className="relative overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl shadow-indigo-500/30">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Total Balance</p>
                      <Zap className="text-yellow-300 animate-pulse" size={20} fill="currentColor" />
                    </div>
                    <h2 className="text-5xl font-black text-white mb-6 tracking-tight">৳{totalBalance.toLocaleString()}</h2>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {['Cash', 'Nagad', 'Upay'].map(w => (
                        <div key={w} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20 hover:bg-white/20 transition-all">
                          <p className="text-white/60 text-[9px] font-bold uppercase mb-1">{w}</p>
                          <p className="text-white text-sm font-black">৳{wallets[w] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Glassmorphism Style */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {l:'Today', v:'today', icon:'🌅', gradient:'from-orange-500 to-rose-500'}, 
                    {l:'Week', v:'week', icon:'📅', gradient:'from-blue-500 to-cyan-500'}, 
                    {l:'Month', v:'month', icon:'📊', gradient:'from-purple-500 to-pink-500'}
                  ].map(s => (
                    <div key={s.l} className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${s.gradient} shadow-lg hover:scale-105 active:scale-95 transition-all`}>
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="relative z-10">
                        <span className="text-2xl mb-2 block">{s.icon}</span>
                        <p className="text-white/80 text-[8px] font-black uppercase tracking-wider mb-1">{s.l}</p>
                        <p className="text-white text-base font-black">৳{getStats(s.v)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Debt Summary Cards - Enhanced */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative overflow-hidden rounded-[1.8rem] p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30 backdrop-blur-sm hover:scale-[1.02] transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                        <ArrowLeftRight size={18} className="text-emerald-400 rotate-90" />
                      </div>
                      <p className="text-emerald-400/70 text-[9px] font-black uppercase tracking-wider mb-1">You'll Receive</p>
                      <p className="text-2xl font-black text-emerald-400">৳{totalObtain}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] text-emerald-400/60 font-bold">{debts.filter(d => d.type === 'Obtain Money').length} people</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[1.8rem] p-5 bg-gradient-to-br from-rose-500/20 to-pink-500/20 border-2 border-rose-500/30 backdrop-blur-sm hover:scale-[1.02] transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center mb-3">
                        <ArrowLeftRight size={18} className="text-rose-400 -rotate-90" />
                      </div>
                      <p className="text-rose-400/70 text-[9px] font-black uppercase tracking-wider mb-1">You'll Pay</p>
                      <p className="text-2xl font-black text-rose-400">৳{totalLoan}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] text-rose-400/60 font-bold">{debts.filter(d => d.type === 'Loan').length} people</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Section - Enhanced */}
                <div className={`${cardClass} p-6 rounded-[2.5rem] border-2 shadow-xl`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase text-indigo-400 flex items-center gap-2">
                      <BarChart3 size={16} />
                      Spending Chart
                    </h3>
                    <div className="px-3 py-1 bg-indigo-500/10 rounded-full">
                      <span className="text-[8px] font-black text-indigo-400">ALL TIME</span>
                    </div>
                  </div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          innerRadius={50} 
                          outerRadius={80} 
                          dataKey="value" 
                          stroke="none"
                          paddingAngle={2}
                        >
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-52 flex items-center justify-center opacity-20">
                      <div className="text-center">
                        <BarChart3 size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold">No spending data yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {['Cash', 'Nagad', 'Upay'].map(w => (
                     <button key={w} onClick={() => setWallet(w)} className={`px-6 py-3 rounded-xl font-black text-xs border transition-all ${wallet === w ? 'bg-indigo-600 border-indigo-400 text-white' : cardClass + ' opacity-60'}`}>
                       {w}
                     </button>
                   ))}
                </div>
                <button onClick={() => {const val = prompt("Enter Deposit Amount:"); if(val) set(ref(db, 'wallets/'+user.uid), {...wallets, [wallet]: (wallets[wallet]||0) + parseFloat(val)})}} className="w-full py-4 bg-emerald-600 rounded-2xl font-black active:scale-95 transition-all text-sm">+ DEPOSIT</button>
                
                <div className={`${cardClass} p-5 rounded-[2rem] border`}>
                  <div className="grid grid-cols-4 gap-2 mb-4 max-h-60 overflow-y-auto p-1 scrollbar-hide">
                    {categories.map(c => (
                      <button key={c.name} onClick={() => setCategory(c.name)} 
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${category === c.name ? 'bg-indigo-600 border-indigo-400 scale-95' : 'bg-gray-800/10 border-transparent'}`}>
                        <span className="text-xl mb-1">{c.icon}</span>
                        <span className={`text-[9px] font-extrabold uppercase tracking-tight text-center leading-tight ${category === c.name ? 'text-white' : 'opacity-70'}`}>{c.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  <form onSubmit={addExpense} className="space-y-3">
                    <input required value={text} onChange={(e) => setText(e.target.value)} placeholder="Spent on?" className={`w-full p-4 ${inputClass} rounded-xl border font-bold text-sm outline-none focus:border-indigo-500`} />
                    <div className="flex gap-2">
                      <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className={`flex-1 p-4 ${inputClass} rounded-xl border font-black text-sm outline-none focus:border-indigo-500`} />
                      <button type="submit" className="px-6 bg-indigo-600 text-white rounded-xl font-black text-sm active:scale-90 transition-all">SAVE</button>
                    </div>
                  </form>
                </div>

                <div className="space-y-2">
                  {expenses.slice(0, 15).map(e => (
                    <div key={e.id} className={`p-4 ${cardClass} rounded-2xl border flex justify-between items-center`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl bg-gray-500/10 p-2 rounded-lg">{categories.find(c => c.name === e.category)?.icon || '💰'}</span>
                        <div>
                          <p className="text-sm font-bold">{e.text}</p>
                          <p className="text-[8px] opacity-40 uppercase font-black">{e.category} • {e.wallet}</p>
                        </div>
                      </div>
                      <p className="text-rose-500 font-black">-৳{e.amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CALENDAR/HISTORY TAB */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <div className={`${cardClass} p-4 rounded-[2rem] border overflow-hidden custom-calendar`}>
                  <Calendar 
                    onChange={setSelectedDate} 
                    value={selectedDate} 
                    tileContent={getTileContent}
                    className="w-full bg-transparent border-none text-inherit" 
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase opacity-40 px-2 italic">{selectedDate.toDateString()}</h4>
                  
                  {dailyShops.map(s => (
                    <div key={s.id} className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
                      <Bell size={16} className="text-indigo-500" />
                      <p className="text-sm font-black text-indigo-400">Remind: {s.text}</p>
                    </div>
                  ))}

                  {dailyExpenses.length > 0 ? dailyExpenses.map(e => (
                    <div key={e.id} className={`p-4 ${cardClass} rounded-2xl border flex justify-between items-center`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{categories.find(c => c.name === e.category)?.icon}</span>
                        <p className="font-bold text-sm">{e.text}</p>
                      </div>
                      <p className="text-rose-500 font-black">-৳{e.amount}</p>
                    </div>
                  ) ) : dailyShops.length === 0 && (
                    <div className="text-center py-10 opacity-20">
                      <Info className="mx-auto mb-2" />
                      <p className="text-xs font-bold">No Records</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* SHOPPING TAB */}
{activeTab === 'shopping' && (
  <div className="space-y-4">
    <div className={`${cardClass} p-6 rounded-[2rem] border`}>
      <h3 className="font-black mb-4 text-indigo-500">SHOPPING LIST</h3>
      <input 
        value={shopItem} 
        onChange={(e) => setShopItem(e.target.value)} 
        placeholder="Item..." 
        className={`w-full p-4 ${inputClass} rounded-xl border mb-3`} 
      />
      
      {/* 📅 Date & 🕒 Time Input - Updated Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[8px] font-black opacity-40 uppercase ml-1 flex items-center gap-1">
            <CalendarIcon size={10}/>Remind Date
          </label>
          <input 
            type="date" 
            id="remindDate" 
            className={`w-full p-3 ${inputClass} rounded-xl border text-xs font-bold mt-1`} 
          />
        </div>
        <div>
          <label className="text-[8px] font-black opacity-40 uppercase ml-1 flex items-center gap-1">
            <Clock size={10}/>Time (Optional)
          </label>
          <input 
            type="time" 
            id="remindTime" 
            className={`w-full p-3 ${inputClass} rounded-xl border text-xs font-bold mt-1`} 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {['Urgent', 'Normal', 'Low'].map(p => (
          <button 
            key={p} 
            onClick={() => setShopPriority(p)} 
            className={`py-2 rounded-lg text-[8px] font-black border transition-all ${shopPriority === p ? 'bg-indigo-600 text-white' : 'opacity-40 border-gray-700'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ➕ ADD ITEM Button - Updated Function */}
      <button 
        onClick={() => {
          const dateInput = document.getElementById('remindDate').value;
          const timeInput = document.getElementById('remindTime').value;
          if(shopItem){
            push(ref(db, 'shopping/'+user.uid), {
              text: shopItem, 
              priority: shopPriority, 
              done: false,
              remindDate: dateInput ? new Date(dateInput).toISOString() : null,
              remindTime: timeInput || null
            }); 
            setShopItem('');
            document.getElementById('remindDate').value = '';
            document.getElementById('remindTime').value = '';
          }
        }} 
        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black active:scale-95"
      >
        ADD ITEM
      </button>
    </div>

    {/* 📋 SHOPPING LIST DISPLAY - Updated with Time */}
    {shoppingList.map(i => (
      <div 
        key={i.id} 
        onClick={() => set(ref(db, `shopping/${user.uid}/${i.id}/done`), !i.done)} 
        className={`p-4 ${cardClass} rounded-xl border flex justify-between items-center transition-all ${i.done ? 'opacity-30 scale-95' : ''}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${i.priority === 'Urgent' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-indigo-500'}`}></div>
          <div>
            <p className={`font-bold ${i.done ? 'line-through' : ''}`}>{i.text}</p>
            {i.remindDate && (
              <p className="text-[7px] opacity-50 font-black uppercase tracking-widest mt-1">
                📅 {new Date(i.remindDate).toDateString()} {i.remindTime && ` • 🕒 ${i.remindTime}`}
              </p>
            )}
          </div>
        </div>
        <CheckCircle2 size={18} className={i.done ? 'text-indigo-500' : 'opacity-20'} />
      </div>
    ))}
  </div>
)}
            {/* DEBTS TAB - UPDATED DESIGN */}
            {activeTab === 'debts' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-full mb-3">
                    <Users size={32} className="text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">Debt Manager</h2>
                  <p className="text-xs opacity-40 mt-1">Track who owes you and who you owe</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/30 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10"></div>
                    <ArrowLeftRight size={20} className="text-emerald-500 mb-2 rotate-90" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400/60">You'll Receive</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">৳{totalObtain.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] text-emerald-400/60 font-bold">{debts.filter(d => d.type === 'Obtain Money').length} people</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-2 border-rose-500/30 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full -mr-10 -mt-10"></div>
                    <ArrowLeftRight size={20} className="text-rose-500 mb-2 -rotate-90" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-rose-400/60">You'll Pay</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">৳{totalLoan.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] text-rose-400/60 font-bold">{debts.filter(d => d.type === 'Loan').length} people</span>
                    </div>
                  </div>
                </div>

                <div className={`${cardClass} p-4 rounded-2xl border text-center`}>
                  <p className="text-[8px] font-black uppercase opacity-40 mb-1">Net Balance</p>
                  <p className={`text-xl font-black ${(totalObtain - totalLoan) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(totalObtain - totalLoan) >= 0 ? '+' : ''}৳{(totalObtain - totalLoan).toLocaleString()}
                  </p>
                </div>

                <div className={`${cardClass} p-5 rounded-[2rem] border`}>
                  <h3 className="font-black mb-4 text-indigo-500 flex items-center gap-2">
                    <Plus size={18} />
                    ADD NEW DEBT
                  </h3>
                  
                  <div className="space-y-3">
                    <input 
                      value={debtName} 
                      onChange={(e) => setDebtName(e.target.value)} 
                      placeholder="Person's Name" 
                      className={`w-full p-4 ${inputClass} rounded-xl border outline-none focus:border-indigo-500 transition-all font-bold text-sm`} 
                    />
                    
                    <input 
                      type="number" 
                      value={debtAmount} 
                      onChange={(e) => setDebtAmount(e.target.value)} 
                      placeholder="Amount (৳)" 
                      className={`w-full p-4 ${inputClass} rounded-xl border font-black text-sm outline-none focus:border-indigo-500 transition-all`} 
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setDebtType('Obtain Money')}
                        className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${debtType === 'Obtain Money' ? 'bg-emerald-600 border-emerald-400 text-white scale-95' : 'border-gray-700 text-gray-500'}`}
                      >
                        💰 I'll GET
                      </button>
                      <button 
                        onClick={() => setDebtType('Loan')}
                        className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${debtType === 'Loan' ? 'bg-rose-600 border-rose-400 text-white scale-95' : 'border-gray-700 text-gray-500'}`}
                      >
                        💸 I'll GIVE
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        if(debtName && debtAmount){
                          push(ref(db, 'debts/'+user.uid), {
                            name: debtName, 
                            amount: parseFloat(debtAmount), 
                            type: debtType
                          }); 
                          setDebtName(''); 
                          setDebtAmount('');
                        }
                      }}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
                    >
                      ADD DEBT
                    </button>
                  </div>
                </div>

                {debts.filter(d => d.type === 'Obtain Money').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase opacity-40 px-2 flex items-center gap-2">
                      <ArrowLeftRight size={14} className="text-emerald-500 rotate-90" />
                      People who owe you
                    </h4>
                    {debts.filter(d => d.type === 'Obtain Money').map(d => (
                      <div 
                        key={d.id} 
                        className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex justify-between items-center group hover:scale-[1.02] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center font-black text-emerald-400 text-lg border-2 border-emerald-500/30">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-white">{d.name}</p>
                            <p className="text-[8px] uppercase font-bold text-emerald-400/60 tracking-wider">Will pay you</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-emerald-400">৳{d.amount}</span>
                          <button 
                            onClick={() => remove(ref(db, `debts/${user.uid}/${d.id}`))}
                            className="opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-500/20 rounded-lg"
                          >
                            <span className="text-rose-500 text-2xl font-light">×</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {debts.filter(d => d.type === 'Loan').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase opacity-40 px-2 flex items-center gap-2">
                      <ArrowLeftRight size={14} className="text-rose-500 -rotate-90" />
                      People you owe
                    </h4>
                    {debts.filter(d => d.type === 'Loan').map(d => (
                      <div 
                        key={d.id} 
                        className="bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/20 p-4 rounded-2xl flex justify-between items-center group hover:scale-[1.02] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center font-black text-rose-400 text-lg border-2 border-rose-500/30">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-white">{d.name}</p>
                            <p className="text-[8px] uppercase font-bold text-rose-400/60 tracking-wider">You owe them</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-rose-400">৳{d.amount}</span>
                          <button 
                            onClick={() => remove(ref(db, `debts/${user.uid}/${d.id}`))}
                            className="opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-500/20 rounded-lg"
                          >
                            <span className="text-rose-500 text-2xl font-light">×</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {debts.length === 0 && (
                  <div className="text-center py-16 opacity-20">
                    <Users className="mx-auto mb-4" size={48} />
                    <p className="text-sm font-bold">No debts recorded</p>
                    <p className="text-xs mt-1">Add your first debt above</p>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="text-center mb-6 relative">
                  <div className="relative inline-block">
                    <img 
                      src={userData.photoURL || user.photoURL} 
                      alt="Profile"
                      className="w-24 h-24 rounded-full border-4 border-indigo-500/30 mx-auto mb-3 object-cover"
                    />
                    <button 
                      onClick={handlePhotoChange}
                      className="absolute bottom-2 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-[#0B0E14] hover:bg-indigo-700 transition-all active:scale-90"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                  <h2 className="text-2xl font-black">{userData.fullName || user.displayName}</h2>
                  <p className="text-xs opacity-40 mt-1">{user.email}</p>
                  
                  {!editMode && (
                    <button 
                      onClick={() => setEditMode(true)}
                      className="mt-4 px-6 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs font-black text-indigo-400 hover:bg-indigo-600/30 active:scale-95 transition-all"
                    >
                      <Edit2 size={12} className="inline mr-2" />
                      EDIT PROFILE
                    </button>
                  )}
                </div>

                <div className={`${cardClass} p-5 rounded-[2rem] border`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black uppercase text-indigo-400">Personal Info</h3>
                    {editMode && (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-700 active:scale-90 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save size={14} />
                          {saving ? 'SAVING...' : 'SAVE'}
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-4 py-2 bg-rose-600 rounded-xl text-xs font-black hover:bg-rose-700 active:scale-90 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <X size={14} />
                          CANCEL
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase opacity-40 mb-2 block flex items-center gap-1">
                        <User size={10} /> Full Name *
                      </label>
                      {editMode ? (
                        <input 
                          type="text"
                          value={tempData.fullName}
                          onChange={(e) => setTempData({...tempData, fullName: e.target.value})}
                          placeholder="Enter your full name"
                          className={`w-full p-3 ${inputClass} rounded-xl border text-sm font-bold outline-none focus:border-indigo-500 transition-all`}
                        />
                      ) : (
                        <div className="p-3 bg-gray-500/5 rounded-xl">
                          <p className="font-bold text-sm">{userData.fullName || 'Not set'}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase opacity-40 mb-2 block flex items-center gap-1">
                        <CalendarIcon size={10} /> Date of Birth *
                      </label>
                      {editMode ? (
                        <input 
                          type="date"
                          value={tempData.dateOfBirth}
                          onChange={(e) => setTempData({...tempData, dateOfBirth: e.target.value})}
                          className={`w-full p-3 ${inputClass} rounded-xl border text-sm font-bold outline-none focus:border-indigo-500 transition-all`}
                        />
                      ) : (
                        <div className="p-3 bg-gray-500/5 rounded-xl">
                          <p className="font-bold text-sm">
                            {userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            }) : 'Not set'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase opacity-40 mb-2 block flex items-center gap-1">
                        <Mail size={10} /> Email Address
                      </label>
                      <div className="p-3 bg-gray-500/5 rounded-xl border border-gray-700/50">
                        <p className="font-bold text-sm opacity-60">{user.email}</p>
                        <p className="text-[7px] text-yellow-400/60 mt-1 flex items-center gap-1">
                          🔒 Linked with Google Account (Cannot be changed)
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase opacity-40 mb-2 block flex items-center gap-1">
                        <Phone size={10} /> Phone Number
                      </label>
                      {editMode ? (
                        <input 
                          type="tel"
                          value={tempData.phone}
                          onChange={(e) => setTempData({...tempData, phone: e.target.value})}
                          placeholder="+880 1XXX-XXXXXX"
                          className={`w-full p-3 ${inputClass} rounded-xl border text-sm font-bold outline-none focus:border-indigo-500 transition-all`}
                        />
                      ) : (
                        <div className="p-3 bg-gray-500/5 rounded-xl">
                          <p className="font-bold text-sm">{userData.phone || 'Not set'}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase opacity-40 mb-2 block flex items-center gap-1">
                        <CalendarIcon size={10} /> Member Since
                      </label>
                      <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <p className="font-bold text-sm text-indigo-400">
                          {new Date(userData.joinedDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {editMode && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <p className="text-[8px] text-yellow-400 font-bold flex items-center gap-2">
                        ⚠️ Changes will be saved to your account permanently
                      </p>
                    </div>
                  )}
                </div>

                <div className={`${cardClass} p-5 rounded-[2rem] border`}>
                  <h3 className="text-sm font-black uppercase text-indigo-400 mb-4">App Settings</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-500/5 rounded-xl hover:bg-gray-500/10 transition-all">
                      <div className="flex items-center gap-3">
                        {darkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-400" />}
                        <div>
                          <p className="text-sm font-bold">Dark Mode</p>
                          <p className="text-[8px] opacity-40">Theme preference</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-14 h-7 rounded-full transition-all ${darkMode ? 'bg-indigo-600' : 'bg-gray-600'} relative`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all shadow-lg ${darkMode ? 'right-0.5' : 'left-0.5'}`}></div>
                      </button>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-500/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <DollarSign size={18} className="text-emerald-400" />
                        <div>
                          <p className="text-sm font-bold">Currency</p>
                          <p className="text-[8px] opacity-40">Default currency</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{userData.currency}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-500/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-blue-400" />
                        <div>
                          <p className="text-sm font-bold">Language</p>
                          <p className="text-[8px] opacity-40">App language</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg">{userData.language}</span>
                    </div>
                  </div>
                </div>

                <div className={`${cardClass} p-5 rounded-[2rem] border`}>
                  <h3 className="text-sm font-black uppercase text-indigo-400 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} />
                    Reports & Export
                  </h3>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => generateReport('weekly')}
                      className="w-full p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl flex justify-between items-center hover:scale-[1.02] active:scale-95 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-indigo-400" />
                        <div className="text-left">
                          <p className="text-sm font-black">Weekly Report</p>
                          <p className="text-[8px] opacity-40 uppercase">Last 7 days summary</p>
                        </div>
                      </div>
                      <Download size={16} className="text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    <button 
                      onClick={() => generateReport('monthly')}
                      className="w-full p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center hover:scale-[1.02] active:scale-95 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-emerald-400" />
                        <div className="text-left">
                          <p className="text-sm font-black">Monthly Report</p>
                          <p className="text-[8px] opacity-40 uppercase">This month summary</p>
                        </div>
                      </div>
                      <Download size={16} className="text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    <button 
                      onClick={downloadExcel}
                      className="w-full p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl flex justify-between items-center hover:scale-[1.02] active:scale-95 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-blue-400" />
                        <div className="text-left">
                          <p className="text-sm font-black">Export All Data</p>
                          <p className="text-[8px] opacity-40 uppercase">Download as Excel</p>
                        </div>
                      </div>
                      <Download size={16} className="text-blue-400 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className={`${cardClass} p-5 rounded-[2rem] border-2 border-rose-500/30`}>
                  <h3 className="text-sm font-black uppercase text-rose-400 mb-4">⚠️ Danger Zone</h3>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={resetAllData}
                      className="w-full p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-rose-400" />
                        <div className="text-left">
                          <p className="text-sm font-black text-rose-400">Reset All Data</p>
                          <p className="text-[8px] opacity-60 uppercase">Delete everything permanently</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => signOut(auth)}
                      className="w-full p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut size={18} className="text-rose-400" />
                        <div className="text-left">
                          <p className="text-sm font-black text-rose-400">Logout</p>
                          <p className="text-[8px] opacity-60 uppercase">Sign out from app</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-center opacity-30 text-xs py-4 space-y-1">
                  <p className="font-black">⚡ VIBE WALLET v1.0.0</p>
                  <p className="text-[10px]">Made with ❤️ in Bangladesh</p>
                </div>
              </div>
            )}

            {/* NAVIGATION */}
            <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm ${darkMode ? 'bg-[#161B22]/90' : 'bg-slate-900/90'} backdrop-blur-xl p-2 rounded-[2.5rem] flex justify-between items-center z-50 border border-white/10 shadow-2xl`}>
              {[ 
                { id: 'home', icon: Home, label: 'Feed' }, 
                { id: 'transactions', icon: ArrowLeftRight, label: 'Cash' }, 
                { id: 'calendar', icon: CalendarIcon, label: 'History' },
                { id: 'shopping', icon: ShoppingCart, label: 'Shop' }, 
                { id: 'debts', icon: Users, label: 'Debt' },
                { id: 'profile', icon: User, label: 'Profile' }
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center flex-1 py-3 rounded-3xl transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                  <item.icon size={18} strokeWidth={activeTab === item.id ? 3 : 2} />
                  {activeTab === item.id && <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">{item.label}</span>}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>

      <style>{`
  .custom-calendar .react-calendar { border: none !important; background: transparent !important; color: inherit !important; font-family: inherit; width: 100%; }
  .custom-calendar .react-calendar__tile { padding: 12px 8px; font-weight: bold; font-size: 0.8rem; transition: 0.3s; }
  .custom-calendar .react-calendar__tile--active { background: #4f46e5 !important; border-radius: 12px; color: white !important; }
  .custom-calendar .react-calendar__tile--now { background: #6366f120; border-radius: 12px; color: #6366f1; }
  .custom-calendar .react-calendar__navigation button { color: #6366f1; font-weight: 900; }
  .custom-calendar .react-calendar__month-view__weekdays { font-size: 0.6rem; text-transform: uppercase; opacity: 0.3; font-weight: 900; }
  .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.1; }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
`}</style>
    </div>
  );
}

export default App;