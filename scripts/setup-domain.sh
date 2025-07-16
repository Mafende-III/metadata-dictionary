#!/bin/bash

# DHIS2 Metadata Dictionary - Domain Setup Script
# This script helps configure domain name and external access

echo "🌐 DHIS2 Metadata Dictionary - Domain Setup"
echo "============================================"

# Function to setup DuckDNS
setup_duckdns() {
    echo "Setting up DuckDNS..."
    read -p "Enter your desired subdomain (e.g., 'mydhis2'): " subdomain
    read -p "Enter your DuckDNS token: " token
    
    # Create DuckDNS update script
    cat > ~/update-duckdns.sh << EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${subdomain}&token=${token}&ip=" | curl -k -o ~/duckdns.log -K -
EOF
    
    chmod +x ~/update-duckdns.sh
    
    # Add to crontab for auto-updates
    (crontab -l 2>/dev/null; echo "*/5 * * * * ~/update-duckdns.sh") | crontab -
    
    echo "✅ DuckDNS configured: ${subdomain}.duckdns.org"
    echo "✅ Auto-update cron job created"
}

# Function to setup No-IP
setup_noip() {
    echo "Setting up No-IP..."
    read -p "Enter your No-IP hostname: " hostname
    read -p "Enter your No-IP username: " username
    read -s -p "Enter your No-IP password: " password
    echo
    
    # Install No-IP client (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew not found. Please install Homebrew first."
            exit 1
        fi
        brew install noip
    fi
    
    echo "✅ No-IP client installed"
    echo "Run: sudo noip -C (to configure)"
}

# Function to check current IP
check_ip() {
    echo "🔍 Checking your current public IP..."
    public_ip=$(curl -s https://api.ipify.org)
    echo "Your public IP: $public_ip"
    
    # Check if port is accessible
    echo "🔍 Testing port 3000 accessibility..."
    if command -v nc &> /dev/null; then
        timeout 5 nc -zv $public_ip 3000 2>&1 | grep -q "succeeded" && echo "✅ Port 3000 is accessible" || echo "❌ Port 3000 is not accessible (check firewall/router)"
    else
        echo "⚠️  netcat not found. Install it to test port accessibility."
    fi
}

# Function to setup router port forwarding (instructions)
setup_port_forwarding() {
    echo "🔧 Port Forwarding Setup Instructions"
    echo "=====================================)"
    echo "1. Access your router admin panel (usually 192.168.1.1 or 192.168.0.1)"
    echo "2. Find 'Port Forwarding' or 'Virtual Server' section"
    echo "3. Add new rule:"
    echo "   - Service Name: DHIS2-MetaDict"
    echo "   - External Port: 3000"
    echo "   - Internal Port: 3000"
    echo "   - Internal IP: $(ipconfig getifaddr en0 2>/dev/null || hostname -I | cut -d' ' -f1)"
    echo "   - Protocol: TCP"
    echo "4. Save and restart router"
    echo ""
    echo "⚠️  Security Note: Only forward ports you need and consider using VPN for sensitive data."
}

# Function to create startup script
create_startup_script() {
    echo "📝 Creating startup script..."
    cat > ~/start-dhis2-metadict.sh << 'EOF'
#!/bin/bash

# DHIS2 Metadata Dictionary Startup Script
cd /Users/mafendemario/Desktop/metadict

# Build production version
echo "🏗️  Building production version..."
npm run build

# Start server with external access
echo "🚀 Starting server..."
echo "Server will be accessible at:"
echo "- Local: http://localhost:3000"
echo "- Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | cut -d' ' -f1):3000"

# Start with custom host binding
HOST=0.0.0.0 PORT=3000 npm start
EOF
    
    chmod +x ~/start-dhis2-metadict.sh
    echo "✅ Startup script created at ~/start-dhis2-metadict.sh"
}

# Function to create monitoring script
create_monitoring_script() {
    echo "📊 Creating monitoring script..."
    cat > ~/monitor-dhis2.sh << 'EOF'
#!/bin/bash

# DHIS2 Metadata Dictionary Monitoring Script
LOG_FILE="/Users/mafendemario/Desktop/metadict/logs/access.log"

echo "📊 DHIS2 Metadata Dictionary - Access Monitor"
echo "============================================="

if [[ -f "$LOG_FILE" ]]; then
    echo "📈 Last 24 hours stats:"
    echo "Total requests: $(grep -c "" "$LOG_FILE" | tail -1000)"
    echo "Unique IPs: $(grep -o '"ip":"[^"]*"' "$LOG_FILE" | sort -u | wc -l)"
    echo ""
    echo "🔥 Top 10 most accessed pages:"
    grep -o '"url":"[^"]*"' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10
    echo ""
    echo "👥 Recent unique visitors:"
    grep -o '"ip":"[^"]*"' "$LOG_FILE" | sort -u | tail -10
else
    echo "❌ Log file not found. Start the application first."
fi
EOF
    
    chmod +x ~/monitor-dhis2.sh
    echo "✅ Monitoring script created at ~/monitor-dhis2.sh"
}

# Main menu
while true; do
    echo ""
    echo "Choose an option:"
    echo "1. Setup DuckDNS (Free)"
    echo "2. Setup No-IP (Free)"
    echo "3. Check current IP and port"
    echo "4. Port forwarding instructions"
    echo "5. Create startup script"
    echo "6. Create monitoring script"
    echo "7. Exit"
    echo ""
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1) setup_duckdns ;;
        2) setup_noip ;;
        3) check_ip ;;
        4) setup_port_forwarding ;;
        5) create_startup_script ;;
        6) create_monitoring_script ;;
        7) echo "👋 Goodbye!"; exit 0 ;;
        *) echo "❌ Invalid choice. Please try again." ;;
    esac
done