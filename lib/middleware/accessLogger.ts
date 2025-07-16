import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface AccessLogEntry {
  timestamp: string;
  ip: string;
  method: string;
  url: string;
  userAgent: string;
  referer?: string;
  responseTime?: number;
  statusCode?: number;
}

export class AccessLogger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'access.log');
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async logRequest(request: NextRequest, response?: NextResponse) {
    const entry: AccessLogEntry = {
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(request),
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || 'unknown',
      referer: request.headers.get('referer') || undefined,
      statusCode: response?.status || undefined,
    };

    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write access log:', error);
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return request.ip || 'unknown';
  }

  async getAccessStats(hours: number = 24): Promise<{
    totalRequests: number;
    uniqueIPs: number;
    topPages: Array<{ url: string; count: number }>;
    recentRequests: AccessLogEntry[];
  }> {
    try {
      // Check if log file exists, if not create it
      try {
        await fs.access(this.logFile);
      } catch {
        await fs.writeFile(this.logFile, '');
      }
      
      const logContent = await fs.readFile(this.logFile, 'utf-8');
      const lines = logContent.trim().split('\n').filter(line => line.length > 0);
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      const recentEntries: AccessLogEntry[] = [];
      const ipSet = new Set<string>();
      const pageCount = new Map<string, number>();
      
      for (const line of lines) {
        try {
          const entry: AccessLogEntry = JSON.parse(line);
          const entryTime = new Date(entry.timestamp);
          
          if (entryTime > cutoffTime) {
            recentEntries.push(entry);
            ipSet.add(entry.ip);
            
            const urlPath = new URL(entry.url).pathname;
            pageCount.set(urlPath, (pageCount.get(urlPath) || 0) + 1);
          }
        } catch (parseError) {
          console.error('Failed to parse log entry:', parseError);
        }
      }
      
      const topPages = Array.from(pageCount.entries())
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        totalRequests: recentEntries.length,
        uniqueIPs: ipSet.size,
        topPages,
        recentRequests: recentEntries.slice(-50), // Last 50 requests
      };
    } catch (error) {
      console.error('Failed to read access stats:', error);
      return {
        totalRequests: 0,
        uniqueIPs: 0,
        topPages: [],
        recentRequests: [],
      };
    }
  }
}

export const accessLogger = new AccessLogger();