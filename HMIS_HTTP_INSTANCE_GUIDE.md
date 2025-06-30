# Rwanda HMIS HTTP Instance Configuration Guide

## 🚨 Your Specific Issue

You're accessing: `https://197.243.28.37/hmis/...` but the browser shows **"Not Secure"**

This means the instance is **HTTP-only** but being accessed via HTTPS, causing security issues.

## ✅ Correct Configuration for Your HMIS

### **Use This URL Instead:**
```
Base URL: http://197.243.28.37/hmis
Username: your-username
Password: your-password
```

### **Why This Happens:**
1. Your DHIS2 instance runs on **HTTP only** (no SSL certificate)
2. Browser tries to access via **HTTPS** = "Not Secure" warning
3. Mixed content policy blocks API calls from HTTPS apps

### **How Our Proxy Solves This:**
```
Your Browser (HTTPS) → Our Server → HMIS (HTTP) ✅
```

## 🔧 Step-by-Step Setup

### **1. Update Instance Configuration**
```
❌ Wrong: https://197.243.28.37/hmis/api
✅ Correct: http://197.243.28.37/hmis/api
```

### **2. Test Connection**
The system will automatically:
- Detect this is an HTTP instance
- Use the server-side proxy
- Show: "🌐 Proxying HTTP instance: http://197.243.28.37/hmis (bypasses mixed content policy)"

### **3. Verify API Access**
Test these endpoints work:
```bash
# System info
curl http://197.243.28.37/hmis/api/system/info

# Your user info  
curl -u username:password http://197.243.28.37/hmis/api/me.json

# SQL views list
curl -u username:password http://197.243.28.37/hmis/api/sqlViews.json
```

## 🌐 Network Requirements

### **Firewall Settings**
Make sure these ports are open:
- **Port 80** (HTTP traffic)
- **Port 443** (if HTTPS is available)
- **Port 8080** (if DHIS2 uses alternative port)

### **Access from Different Networks**
```bash
# Test from your current network
curl -I http://197.243.28.37/hmis/api/system/info

# Check if accessible from our server location
# (This is what the proxy will do)
```

## 🔍 Troubleshooting Your Instance

### **Common Issues:**

#### **1. "Connection Refused"**
```bash
# Check if instance is running
ping 197.243.28.37

# Test port connectivity
telnet 197.243.28.37 80
```

#### **2. "Authentication Failed"**
- Verify username/password in DHIS2 web interface
- Ensure user has API access permissions
- Check if account is not locked/expired

#### **3. "Firewall Blocking"**
- Instance may only allow specific IP ranges
- Contact your HMIS administrator
- Verify network policies

## 🔐 Security Considerations

### **HTTP Instance (Your Case):**
✅ **Safe with our proxy** - Server-side connection to HTTP instance
✅ **Data encrypted** - Between your browser and our server (HTTPS)
⚠️ **HTTP segment** - Between our server and HMIS (internal network)

### **Production Recommendation:**
For production use, consider:
1. Setting up SSL certificate on HMIS instance
2. Using VPN for secure access
3. Network-level encryption

## 🎯 Quick Test Commands

### **Test 1: Basic Connectivity**
```bash
curl -I http://197.243.28.37/hmis/api/system/info
```

### **Test 2: Authentication**
```bash
curl -u yourusername:yourpassword http://197.243.28.37/hmis/api/me.json
```

### **Test 3: SQL Views**
```bash
curl -u yourusername:yourpassword http://197.243.28.37/hmis/api/sqlViews.json?fields=id,name&pageSize=5
```

## 📋 Application Setup Checklist

- [ ] Use `http://197.243.28.37/hmis` as base URL
- [ ] Enter correct HMIS credentials
- [ ] Test connection (should show proxy detection)
- [ ] Verify SQL views are accessible
- [ ] Create test dictionary from SQL view
- [ ] Confirm all API calls work through proxy

## 💡 Pro Tips for HMIS

1. **Always use HTTP** for this instance (not HTTPS)
2. **Check with IT team** about SSL certificate availability
3. **Use proxy feature** for all API access (automatic)
4. **Test from command line** before application setup
5. **Verify permissions** with HMIS administrator

The server-side proxy makes it completely safe to use your HTTP-only HMIS instance! 🎉
