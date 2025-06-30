# HTTP Instance Setup Examples

## 🚀 Quick Setup for Common Scenarios

### 1. **Docker Desktop DHIS2**
```bash
# Pull and run DHIS2 in Docker
docker run -d -p 8080:8080 --name dhis2 dhis2/dhis2:2.40.1

# Wait for startup (check logs)
docker logs -f dhis2

# Test accessibility
curl http://localhost:8080/api/system/info
```

**Application Setup:**
```
Base URL: http://localhost:8080
Username: admin
Password: district
```

### 2. **Local Network DHIS2**
```bash
# Find your local IP
ipconfig getifaddr en0  # macOS
ip route get 1 | awk '{print $7}'  # Linux

# Example: Your IP is 192.168.1.105
```

**Application Setup:**
```
Base URL: http://192.168.1.105:8080
Username: admin  
Password: district
```

### 3. **Ubuntu Server DHIS2**
```bash
# Install DHIS2 on Ubuntu server
sudo apt update
sudo wget -O dhis2.war https://releases.dhis2.org/2.40/dhis2.war
sudo cp dhis2.war /var/lib/tomcat9/webapps/

# Start services
sudo systemctl start tomcat9
sudo systemctl start postgresql

# Check status
sudo systemctl status dhis2
```

**Application Setup:**
```
Base URL: http://your-server-ip:8080/dhis2
Username: admin
Password: your-password
```

### 4. **Development VM**
```bash
# In VM (Ubuntu/CentOS)
sudo docker run -d -p 8080:8080 dhis2/dhis2

# From host machine, find VM IP
# VirtualBox: Usually 192.168.56.x
# VMware: Usually 192.168.x.x
```

**Application Setup:**
```
Base URL: http://192.168.56.101:8080
Username: admin
Password: district
```

## 🔧 Troubleshooting Commands

### Test DHIS2 Accessibility
```bash
# Test from local machine
curl -I http://localhost:8080/api/system/info

# Test from network
curl -I http://192.168.1.105:8080/api/system/info

# Test with authentication
curl -u admin:district http://localhost:8080/api/me.json
```

### Network Diagnostics
```bash
# Check if port is open
telnet localhost 8080
nc -zv localhost 8080

# Check from another machine
nmap -p 8080 192.168.1.105

# Check firewall (Ubuntu)
sudo ufw status
sudo ufw allow 8080
```

### Docker Troubleshooting
```bash
# Check running containers
docker ps

# Check container logs
docker logs dhis2

# Access container shell
docker exec -it dhis2 bash

# Restart container
docker restart dhis2
```

## 📋 Testing Checklist

- [ ] DHIS2 responds to http://your-ip:8080/api/system/info
- [ ] Authentication works: http://your-ip:8080/api/me.json
- [ ] Firewall allows port 8080
- [ ] Can access from other network devices
- [ ] Application proxy test passes
- [ ] Can create and execute SQL views

## 🎯 Common Issues & Solutions

### "Connection Refused"
```bash
# Check if DHIS2 is running
docker ps | grep dhis2
sudo systemctl status dhis2

# Check port binding
netstat -tlnp | grep 8080
ss -tlnp | grep 8080
```

### "Host Not Found"
```bash
# Verify IP address
ping 192.168.1.105

# Check DNS resolution
nslookup your-hostname
```

### "Network Unreachable"
```bash
# Check route to host
traceroute 192.168.1.105
mtr 192.168.1.105

# Test basic connectivity
ping -c 4 192.168.1.105
```

### "Firewall Blocking"
```bash
# Ubuntu/Debian
sudo ufw allow from 192.168.1.0/24 to any port 8080

# CentOS/RHEL
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Docker (if using host networking)
docker run -d --network host dhis2/dhis2
```

