# HTTP Instance Support Guide 

## 🚨 Mixed Content Security Issue

When developing with local DHIS2 instances, you often encounter the **mixed content security policy** error. This happens when:

- Your application is served over **HTTPS** (like in production or hosted environments)
- Your DHIS2 instance runs on **HTTP** (typical for local development)
- Browsers block HTTP requests from HTTPS pages for security

## ✅ Solution: Server-Side Proxy

This application includes a **built-in server-side proxy** that automatically handles HTTP instances and bypasses browser security restrictions.

### **How It Works**

```
Browser (HTTPS) → Next.js Server → Local DHIS2 (HTTP) ✅
```

The proxy acts as an intermediary, making server-side requests to your HTTP DHIS2 instance and returning the data to your browser safely.

## 🔧 Configuration for HTTP Instances

### **1. Using the Admin Interface**

1. **Add Your Instance:**
   ```
   Name: Local Development
   Base URL: http://192.168.1.100:8080  (your local IP)
   Username: admin
   Password: district
   ```

2. **Test Connection:**
   - The system automatically uses the proxy for HTTP instances
   - You'll see: `🌐 Proxying HTTP instance: http://192.168.1.100:8080 (bypasses mixed content policy)`

### **2. Manual API Usage**

If calling the proxy directly:

```javascript
// Example: Fetch system info from HTTP instance
const response = await fetch('/api/dhis2/proxy?path=/system/info', {
  headers: {
    'Authorization': 'Basic ' + btoa('admin:district'),
    'x-dhis2-base-url': 'http://192.168.1.100:8080/api',
    'Content-Type': 'application/json'
  }
});
```

### **3. Environment Variables (Development)**

```bash
# .env.local
NEXT_PUBLIC_DHIS2_BASE_URL=http://localhost:8080/api
DHIS2_USERNAME=admin
DHIS2_PASSWORD=district
```

## 🌐 Common HTTP Instance URLs

### **Local Development Patterns:**

| Pattern | Example | Notes |
|---------|---------|-------|
| Localhost | `http://localhost:8080` | May not work from other devices |
| Local IP | `http://192.168.1.100:8080` | Accessible from network |
| Docker | `http://dhis2:8080` | Container networking |
| VM/Server | `http://10.0.0.50:8080` | Virtual machine IP |

### **Finding Your Local IP:**

```bash
# Windows
ipconfig | findstr IPv4

# macOS/Linux  
ifconfig | grep inet

# Alternative
hostname -I
```

## 🔍 Testing HTTP Instance Connection

### **1. Direct Browser Test**
Visit: `http://your-instance-ip:8080/api/system/info`

Expected response:
```json
{
  "version": "2.40.1",
  "instanceName": "DHIS2 Demo",
  "serverDate": "2024-01-20T10:30:00.000Z"
}
```

### **2. Using Application Test**
1. Go to **Instances** → **Add Instance**
2. Enter your HTTP URL
3. Click **Test Connection**
4. Should show: ✅ **Connection successful via proxy**

### **3. Command Line Test**
```bash
# Test from your server/computer
curl -u admin:district http://192.168.1.100:8080/api/system/info

# Test the proxy endpoint
curl -X GET "http://localhost:3000/api/dhis2/proxy?path=/system/info" \
  -H "Authorization: Basic $(echo -n 'admin:district' | base64)" \
  -H "x-dhis2-base-url: http://192.168.1.100:8080/api"
```

## 🛠️ Troubleshooting HTTP Instances

### **Common Issues & Solutions:**

#### **1. Connection Refused**
```
❌ Error: Connection refused
```

**Solutions:**
- Check if DHIS2 is running: `docker ps` or service status
- Verify port is correct (usually 8080)
- Check firewall settings
- Try IP address instead of localhost

#### **2. Host Not Found**
```
❌ Error: Host not found
```

**Solutions:**
- Verify IP address is correct
- Ensure device is on same network
- Check DNS resolution
- Try pinging the host first

#### **3. Authentication Failed**
```
❌ Error: 401 Unauthorized
```

**Solutions:**
- Verify username/password
- Check if user account is active
- Ensure API access permissions
- Try different user credentials

#### **4. Timeout Errors**
```
❌ Error: Request timeout
```

**Solutions:**
- Instance may be slow to respond
- Check instance performance
- Increase timeout in configuration
- Verify network connectivity

## 🚀 Production Considerations

### **For Production Deployments:**

1. **Use HTTPS Instances Only**
   ```
   ✅ https://your-dhis2-production.org/api
   ❌ http://your-dhis2-production.org/api
   ```

2. **SSL Certificate Setup**
   - Ensure valid SSL certificates
   - Use trusted certificate authorities
   - Avoid self-signed certificates in production

3. **Network Security**
   - Configure proper firewall rules
   - Use VPN for internal instances
   - Implement network segmentation

## 🔒 Security Best Practices

### **Development Environment:**
- ✅ HTTP instances are acceptable for local development
- ✅ Use the server-side proxy for security
- ✅ Keep credentials secure in environment variables

### **Production Environment:**
- ✅ Always use HTTPS for production instances
- ✅ Use strong, unique passwords
- ✅ Implement proper user permissions
- ✅ Regular security updates

## 📝 Example Configurations

### **Docker Compose DHIS2 (Local)**
```yaml
version: '3.8'
services:
  dhis2:
    image: dhis2/dhis2:2.40.1
    ports:
      - "8080:8080"
    environment:
      - DHIS2_DATABASE_HOST=postgres
      - DHIS2_DATABASE_USERNAME=dhis
      - DHIS2_DATABASE_PASSWORD=password
```

**Application Configuration:**
```
Base URL: http://localhost:8080
Username: admin  
Password: district
```

### **Local Server Instance**
```bash
# Ubuntu/Debian DHIS2 installation
sudo systemctl start dhis2
sudo systemctl status dhis2

# Check if accessible
curl http://localhost:8080/api/system/info
```

**Application Configuration:**
```
Base URL: http://192.168.1.100:8080
Username: admin
Password: your-password
```

## 🎯 Quick Start Checklist

- [ ] DHIS2 instance is running and accessible
- [ ] Note the IP address and port
- [ ] Test direct browser access to `/api/system/info`
- [ ] Add instance in application with HTTP URL
- [ ] Test connection through the proxy
- [ ] Create and test a dictionary with SQL views
- [ ] Verify all API calls work through the proxy

## 💡 Pro Tips

1. **Use IP addresses** instead of localhost for network accessibility
2. **Test connectivity first** before configuring the application
3. **Check firewall settings** if connection fails
4. **Use the proxy logs** to troubleshoot issues
5. **Keep HTTP for development**, HTTPS for production

The server-side proxy makes it seamless to work with HTTP instances during development while maintaining security and compatibility! 🎉 