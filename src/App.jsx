import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, ref, push, onValue } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { remove, set } from 'firebase/database';
import { ShoppingCart, ArrowLeftRight, Users, Plus, Home, LogOut, CheckCircle2, Zap, Moon, Sun, Calendar as CalendarIcon, Bell, Info, Download } from 'lucide-react';
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
  const [shopItem, setShopItem] = useState('');
  const [shopPriority, setShopPriority] = useState('Normal'); 
  const [debts, setDebts] = useState([]);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('Obtain Money');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // --- নতুন যোগ করা Excel Download ফাংশন ---
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

  const categories = [
    { name: 'যাতায়াত', icon: '🚌', color: '#6366f1' }, 
    { name: 'পড়াশোনা', icon: '📚', color: '#10b981' },
    { name: 'পান', icon: '☕', color: '#f59e0b' }, 
    { name: 'নাস্তা', icon: '🥐', color: '#ef4444' },
    { name: 'দান', icon: '🤲', color: '#8b5cf6' }, 
    { name: 'জমা', icon: '🏦', color: '#ec4899' },
    { name: 'শখ', icon: '🎨', color: '#06b6d4' }, 
    { name: 'বিপদ', icon: '🆘', color: '#f43f5e' },
    { name: 'বাসা', icon: '🏠', color: '#f97316' }, 
    { name: 'ঘুরা', icon: '🏞️', color: '#84cc16' },
    { name: 'গিফট', icon: '🎁', color: '#d946ef' }, 
    { name: 'কোচিং', icon: '🏫', color: '#64748b' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, 'expenses/' + currentUser.uid), (snapshot) => {
          const data = snapshot.val();
          setExpenses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
        });
        onValue(ref(db, 'wallets/' + currentUser.uid), (snapshot) => {
          if (snapshot.exists()) setWallets(snapshot.val());
        });
        onValue(ref(db, 'shopping/' + currentUser.uid), (snapshot) => {
          const data = snapshot.val();
          setShoppingList(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
        });
        onValue(ref(db, 'debts/' + currentUser.uid), (snapshot) => {
          const data = snapshot.val();
          setDebts(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
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

  const themeClass = darkMode ? "bg-[#0B0E14] text-white" : "bg-[#F3F4F6] text-slate-900";
  const cardClass = darkMode ? "bg-[#161B22] border-gray-800" : "bg-white border-gray-200 shadow-sm";
  const inputClass = darkMode ? "bg-[#0B0E14] border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-slate-900";

  return (
    <div className={`min-h-screen ${themeClass} font-sans transition-colors duration-300`}>
      <div className="max-w-md mx-auto p-4 pb-32 relative z-10">
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
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[{l:'Today', v:'today'}, {l:'Week', v:'week'}, {l:'Month', v:'month'}].map(s => (
                    <div key={s.l} className={`${cardClass} p-3 rounded-2xl border text-center`}>
                      <p className="text-[8px] font-black uppercase opacity-40">{s.l}</p>
                      <p className="text-xs font-black text-rose-500">৳{getStats(s.v)}</p>
                    </div>
                  ))}
                </div>
                <div className={`p-6 rounded-[2rem] ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-600 text-white'} border border-indigo-500/30 text-center`}>
                   <p className="text-[10px] font-black uppercase opacity-60">Total Balance</p>
                   <h2 className="text-4xl font-black my-4">৳{totalBalance.toLocaleString()}</h2>
                   <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'Nagad', 'Upay'].map(w => (
                        <div key={w} className="p-2 bg-black/20 rounded-xl border border-white/5">
                          <p className="text-[8px] font-bold uppercase">{w}</p>
                          <p className="text-[10px] font-black">৳{wallets[w] || 0}</p>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 ${cardClass} rounded-2xl border`}>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Receive</p>
                    <p className="text-lg font-black text-emerald-500">৳{totalObtain}</p>
                  </div>
                  <div className={`p-4 ${cardClass} rounded-2xl border`}>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Payable</p>
                    <p className="text-lg font-black text-rose-500">৳{totalLoan}</p>
                  </div>
                </div>
                <div className={`${cardClass} p-4 rounded-[2rem] border h-56`}>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={45} outerRadius={60} dataKey="value" stroke="none">
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
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
                  <input value={shopItem} onChange={(e) => setShopItem(e.target.value)} placeholder="Item..." className={`w-full p-4 ${inputClass} rounded-xl border mb-3`} />
                  
                  <div className="flex flex-col gap-2 mb-3">
                    <label className="text-[8px] font-black opacity-40 uppercase ml-1">Reminder Date (Optional)</label>
                    <input type="date" id="remindDate" className={`w-full p-3 ${inputClass} rounded-xl border text-xs font-bold`} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {['Urgent', 'Normal', 'Low'].map(p => (
                      <button key={p} onClick={() => setShopPriority(p)} className={`py-2 rounded-lg text-[8px] font-black border transition-all ${shopPriority === p ? 'bg-indigo-600 text-white' : 'opacity-40 border-gray-700'}`}>{p}</button>
                    ))}
                  </div>
                  <button onClick={() => {
                    const dateInput = document.getElementById('remindDate').value;
                    if(shopItem){
                      push(ref(db, 'shopping/'+user.uid), {
                        text: shopItem, 
                        priority: shopPriority, 
                        done: false,
                        remindDate: dateInput ? new Date(dateInput).toISOString() : null
                      }); 
                      setShopItem('');
                    }
                  }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black active:scale-95">ADD ITEM</button>
                </div>
                {shoppingList.map(i => (
                  <div key={i.id} onClick={() => set(ref(db, `shopping/${user.uid}/${i.id}/done`), !i.done)} className={`p-4 ${cardClass} rounded-xl border flex justify-between items-center transition-all ${i.done ? 'opacity-30 scale-95' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i.priority === 'Urgent' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-indigo-500'}`}></div>
                      <div>
                        <p className={`font-bold ${i.done ? 'line-through' : ''}`}>{i.text}</p>
                        {i.remindDate && <p className="text-[7px] opacity-50 font-black uppercase tracking-widest">{new Date(i.remindDate).toDateString()}</p>}
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
    {/* Header with Icon */}
    <div className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-full mb-3">
        <Users size={32} className="text-indigo-500" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">Debt Manager</h2>
      <p className="text-xs opacity-40 mt-1">Track who owes you and who you owe</p>
    </div>

    {/* Summary Cards */}
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* Receive Card */}
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

      {/* Payable Card */}
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

    {/* Net Balance */}
    <div className={`${cardClass} p-4 rounded-2xl border text-center`}>
      <p className="text-[8px] font-black uppercase opacity-40 mb-1">Net Balance</p>
      <p className={`text-xl font-black ${(totalObtain - totalLoan) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {(totalObtain - totalLoan) >= 0 ? '+' : ''}৳{(totalObtain - totalLoan).toLocaleString()}
      </p>
    </div>

    {/* Add New Debt Form */}
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

    {/* Debt Lists - Receive Section */}
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

    {/* Debt Lists - Pay Section */}
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

    {/* Empty State */}
    {debts.length === 0 && (
      <div className="text-center py-16 opacity-20">
        <Users className="mx-auto mb-4" size={48} />
        <p className="text-sm font-bold">No debts recorded</p>
        <p className="text-xs mt-1">Add your first debt above</p>
      </div>
    )}
  </div>
)}

            {/* NAVIGATION */}
            <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm ${darkMode ? 'bg-[#161B22]/90' : 'bg-slate-900/90'} backdrop-blur-xl p-2 rounded-[2.5rem] flex justify-between items-center z-50 border border-white/10 shadow-2xl`}>
              {[ 
                { id: 'home', icon: Home, label: 'Feed' }, 
                { id: 'transactions', icon: ArrowLeftRight, label: 'Cash' }, 
                { id: 'calendar', icon: CalendarIcon, label: 'History' },
                { id: 'shopping', icon: ShoppingCart, label: 'Shop' }, 
                { id: 'debts', icon: Users, label: 'Debt' } 
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
      `}</style>
    </div>
  );
}

export default App;