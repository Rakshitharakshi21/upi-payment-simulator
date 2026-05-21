import React, { useState, useEffect } from 'react';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [upiId, setUpiId] = useState('');
    const [mpin, setMpin] = useState('');
    const [balance, setBalance] = useState(0);
    const [toUpiId, setToUpiId] = useState('');
    const [amount, setAmount] = useState('');
    const [sendMpin, setSendMpin] = useState('');
    const [message, setMessage] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [showRegister, setShowRegister] = useState(false);
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regMobile, setRegMobile] = useState('');
    const [regMpin, setRegMpin] = useState('');

    // Fetch transactions
    const fetchTransactions = async (tok) => {
        try {
            const res = await fetch('http://localhost:5000/api/transactions', {
                headers: { 'Authorization': `Bearer ${tok || token}` }
            });
            const data = await res.json();
            if (data.transactions) setTransactions(data.transactions);
        } catch (err) {
            console.error(err);
        }
    };

    // Login
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upiId, mpin })
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
                setBalance(data.wallet.balance);
                setMessage('Login successful!');
                fetchTransactions(data.token);
            } else {
                setMessage('Login failed: ' + data.error);
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
        }
    };

    // Register
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regName,
                    email: regEmail,
                    mobile: regMobile,
                    mpin: regMpin
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`Registered! Your UPI ID: ${data.user.upiId}`);
                setShowRegister(false);
                setRegName('');
                setRegEmail('');
                setRegMobile('');
                setRegMpin('');
            } else {
                setMessage('Registration failed: ' + data.error);
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
        }
    };

    // Send payment
    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/payments/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    toUpiId: toUpiId,
                    amount: parseInt(amount),
                    mpin: sendMpin
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`Sent Rs${amount} to ${toUpiId}`);
                setBalance(data.balance);
                setToUpiId('');
                setAmount('');
                setSendMpin('');
                fetchTransactions();
            } else {
                setMessage('Payment failed: ' + data.error);
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
        }
    };

    // Logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUpiId('');
        setMpin('');
        setMessage('Logged out');
    };

    // Styles
    const inputStyle = {
        width: '100%',
        padding: '10px',
        margin: '8px 0',
        borderRadius: '5px',
        border: '1px solid #ddd',
        fontSize: '16px',
        boxSizing: 'border-box'
    };

    const buttonStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: '#e94560',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        marginTop: '10px',
        fontWeight: 'bold'
    };

    const cardStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '450px'
    };

    // Login/Register Screen
    if (!token) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh', 
                backgroundColor: '#f0f2f5',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={cardStyle}>
                    <h2 style={{ textAlign: 'center', color: '#1a1a2e', marginBottom: '25px' }}>
                        UPI Payment Gateway
                    </h2>
                    
                    {showRegister ? (
                        <>
                            <h3 style={{ textAlign: 'center' }}>Create Account</h3>
                            <form onSubmit={handleRegister}>
                                <input type="text" placeholder="Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} style={inputStyle} required />
                                <input type="email" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} style={inputStyle} required />
                                <input type="tel" placeholder="Mobile Number" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} style={inputStyle} required />
                                <input type="password" placeholder="MPIN (4 digits)" value={regMpin} onChange={(e) => setRegMpin(e.target.value)} maxLength="4" style={inputStyle} required />
                                <button type="submit" style={buttonStyle}>Register</button>
                            </form>
                            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                                <button onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer' }}>
                                    Back to Login
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 style={{ textAlign: 'center' }}>Login</h3>
                            <form onSubmit={handleLogin}>
                                <input type="text" placeholder="UPI ID (e.g., name123@upi)" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={inputStyle} required />
                                <input type="password" placeholder="MPIN" value={mpin} onChange={(e) => setMpin(e.target.value)} maxLength="4" style={inputStyle} required />
                                <button type="submit" style={buttonStyle}>Login</button>
                            </form>
                            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                                <button onClick={() => setShowRegister(true)} style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer' }}>
                                    New user? Register here
                                </button>
                            </p>
                        </>
                    )}
                    
                    {message && (
                        <p style={{ 
                            marginTop: '15px', 
                            padding: '10px', 
                            borderRadius: '5px',
                            backgroundColor: message.includes('successful') ? '#d4edda' : '#f8d7da',
                            color: message.includes('successful') ? '#155724' : '#721c24',
                            textAlign: 'center'
                        }}>
                            {message}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Dashboard Screen
    return (
        <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ color: '#1a1a2e' }}>UPI Payment Gateway</h2>
                <button onClick={handleLogout} style={{ ...buttonStyle, width: 'auto', padding: '8px 20px', backgroundColor: '#666' }}>Logout</button>
            </div>
            
            <div style={{ 
                backgroundColor: '#1a1a2e', 
                color: 'white', 
                padding: '30px', 
                borderRadius: '15px', 
                marginBottom: '25px', 
                textAlign: 'center' 
            }}>
                <h3 style={{ margin: 0, opacity: 0.8 }}>Your Balance</h3>
                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '10px 0', color: '#e94560' }}>
                    ₹{balance.toLocaleString()}
                </div>
            </div>

            <div style={{ 
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '15px', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', 
                marginBottom: '30px' 
            }}>
                <h3 style={{ marginTop: 0, color: '#1a1a2e' }}>Send Money</h3>
                <form onSubmit={handlePayment}>
                    <input type="text" placeholder="Receiver's UPI ID" value={toUpiId} onChange={(e) => setToUpiId(e.target.value)} style={inputStyle} required />
                    <input type="number" placeholder="Amount (Rs)" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} min="1" required />
                    <input type="password" placeholder="Your MPIN" value={sendMpin} onChange={(e) => setSendMpin(e.target.value)} maxLength="4" style={inputStyle} required />
                    <button type="submit" style={buttonStyle}>Send Payment</button>
                </form>
            </div>

            <div>
                <h3 style={{ color: '#1a1a2e' }}>Transaction History</h3>
                {transactions.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                        No transactions yet
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>To/From</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.slice(0, 10).map(txn => (
                                    <tr key={txn._id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{txn.transactionId?.slice(-8)}</td>
                                        <td style={{ padding: '12px' }}>{txn.toUpiId || txn.fromUpiId}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{txn.amount}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '4px', 
                                                fontSize: '12px',
                                                backgroundColor: txn.status === 'SUCCESS' ? '#d4edda' : '#f8d7da',
                                                color: txn.status === 'SUCCESS' ? '#155724' : '#721c24'
                                            }}>
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '12px' }}>{new Date(txn.timestamp).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {message && (
                <p style={{ 
                    marginTop: '20px', 
                    padding: '12px', 
                    borderRadius: '8px',
                    backgroundColor: message.includes('Sent') ? '#d4edda' : '#f8d7da',
                    color: message.includes('Sent') ? '#155724' : '#721c24',
                    textAlign: 'center'
                }}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default App;