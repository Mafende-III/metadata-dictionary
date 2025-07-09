/**
 * DHIS2 API URL Service
 * Generates proper API URLs based on metadata type and DHIS2 documentation patterns
 * Reference: https://docs.dhis2.org/
 */

export interface ApiUrlOptions {
  variableUid: string;
  variableType: string;
  period?: string;
  orgUnit?: string;
  format?: 'json' | 'xml' | 'csv';
  includeMetadata?: boolean;
}

export interface ApiUrls {
  analytics: string;
  metadata: string;
  dataValues?: string; // Only for dataElements
  dhis2WebUrl: string;
  exportUrl: string;
}

export class DHIS2ApiUrlService {
  
  /**
   * Generate all relevant API URLs for a variable based on its type
   * Follows DHIS2 API documentation patterns
   */
  static generateApiUrls(baseUrl: string, options: ApiUrlOptions): ApiUrls {
    const {
      variableUid,
      variableType,
      period = 'THIS_YEAR',
      orgUnit = 'USER_ORGUNIT',
      format = 'json',
      includeMetadata = true
    } = options;

    // CRITICAL VALIDATION: Ensure we have a valid DHIS2 UID
    if (!variableUid || typeof variableUid !== 'string') {
      throw new Error(`Invalid variable UID: ${variableUid}. Expected 11-character DHIS2 UID.`);
    }

    // Check if this looks like a generated UUID instead of a DHIS2 UID
    const isGeneratedUUID = variableUid.includes('-') || variableUid.length !== 11;
    if (isGeneratedUUID) {
      console.error(`❌ CRITICAL ERROR: Received generated UUID instead of DHIS2 UID: ${variableUid}`);
      console.error(`❌ Expected format: 11-character alphanumeric string (e.g., "OwvmJaiVIBU")`);
      console.error(`❌ Received format: UUID with dashes (e.g., "generated_42df1b46-d0e1-424f-90c9-0e23333a0b42")`);
      throw new Error(`Invalid DHIS2 UID format: ${variableUid}. Expected 11-character alphanumeric string, not UUID.`);
    }

    // Validate DHIS2 UID format (11 characters, alphanumeric)
    if (!/^[a-zA-Z0-9]{11}$/.test(variableUid)) {
      throw new Error(`Invalid DHIS2 UID format: ${variableUid}. Must be 11 alphanumeric characters.`);
    }

    console.log(`✅ Valid DHIS2 UID confirmed: ${variableUid} for type: ${variableType}`);

    // Normalize base URL - ensure it ends with /api
    const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);
    const webBaseUrl = normalizedBaseUrl.replace('/api', '');

    // Generate URLs based on metadata type
    const urls: ApiUrls = {
      analytics: this.generateAnalyticsUrl(normalizedBaseUrl, variableUid, variableType, period, orgUnit, includeMetadata),
      metadata: this.generateMetadataUrl(normalizedBaseUrl, variableUid, variableType, format),
      dhis2WebUrl: this.generateWebUrl(webBaseUrl, variableUid, variableType),
      exportUrl: this.generateExportUrl(normalizedBaseUrl, variableUid, variableType, format)
    };

    // Add dataValues URL only for dataElements (raw data)
    if (this.supportsDataValues(variableType)) {
      urls.dataValues = this.generateDataValuesUrl(normalizedBaseUrl, variableUid, period, orgUnit, format);
      console.log(`📊 Data values URL generated for data element ${variableUid}: ${urls.dataValues}`);
    } else {
      console.log(`ℹ️ Data values URL not applicable for ${variableType} (${variableUid}) - calculated values only`);
    }

    console.log(`🔗 Complete API URLs generated for DHIS2 UID ${variableUid}:`, {
      analytics: urls.analytics,
      metadata: urls.metadata,
      dataValues: urls.dataValues,
      webUrl: urls.dhis2WebUrl
    });

    return urls;
  }

  /**
   * Generate analytics API URL based on metadata type
   * Reference: https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/analytics.html
   */
  private static generateAnalyticsUrl(
    baseUrl: string,
    uid: string,
    type: string,
    period: string,
    orgUnit: string,
    includeMetadata: boolean
  ): string {
    // Ensure the UID is a valid DHIS2 UID (11 characters, alphanumeric)
    if (!uid || uid.length !== 11 || !/^[a-zA-Z0-9]{11}$/.test(uid)) {
      console.warn(`⚠️ Invalid DHIS2 UID provided: ${uid}. Expected 11-character alphanumeric string.`);
    }

    const params = new URLSearchParams();
    
    // Set dimensions properly - dimension parameter expects semicolon-separated values
    params.set('dimension', `dx:${uid};pe:${period};ou:${orgUnit}`);
    params.set('displayProperty', 'NAME');
    params.set('outputFormat', 'JSON');
    params.set('skipRounding', 'false');

    if (includeMetadata) {
      params.set('includeMetadataDetails', 'true');
    }

    // Add type-specific parameters based on DHIS2 documentation
    const normalizedType = this.normalizeMetadataType(type);
    switch (normalizedType) {
      case 'dataElements':
        // Data elements - raw aggregated data
        params.set('aggregationType', 'DEFAULT');
        break;
      case 'indicators':
        // Indicators - calculated values, no raw data values API
        params.set('aggregationType', 'DEFAULT');
        break;
      case 'programIndicators':
        // Program indicators from tracker data
        params.set('aggregationType', 'DEFAULT');
        params.set('ouMode', 'DESCENDANTS'); // Often needed for program indicators
        break;
      default:
        params.set('aggregationType', 'DEFAULT');
    }

    const finalUrl = `${baseUrl}/analytics?${params.toString()}`;
    console.log(`🔗 Generated analytics URL for ${uid} (${normalizedType}): ${finalUrl}`);
    
    return finalUrl;
  }

  /**
   * Generate metadata API URL
   * Reference: https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/metadata.html
   */
  private static generateMetadataUrl(baseUrl: string, uid: string, type: string, format: string): string {
    const normalizedType = this.normalizeMetadataType(type);
    let endpoint = '';
    let fields = '';

    switch (normalizedType) {
      case 'dataElements':
        endpoint = 'dataElements';
        fields = 'id,name,displayName,code,description,valueType,domainType,aggregationType,categoryCombo[id,name],dataElementGroups[id,name],lastUpdated,created';
        break;
      case 'indicators':
        endpoint = 'indicators';
        fields = 'id,name,displayName,code,description,numerator,denominator,indicatorType[id,name],indicatorGroups[id,name],annualized,lastUpdated,created';
        break;
      case 'programIndicators':
        endpoint = 'programIndicators';
        fields = 'id,name,displayName,code,description,expression,filter,program[id,name],aggregationType,analyticsType,lastUpdated,created';
        break;
      default:
        endpoint = normalizedType;
        fields = 'id,name,displayName,code,description,lastUpdated,created';
    }

    const params = new URLSearchParams({
      fields: fields
    });

    const formatSuffix = format === 'json' ? '.json' : format === 'xml' ? '.xml' : '';
    return `${baseUrl}/${endpoint}/${uid}${formatSuffix}?${params.toString()}`;
  }

  /**
   * Generate data values API URL (only for dataElements)
   * Reference: https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/data.html#webapi_data_values
   */
  private static generateDataValuesUrl(
    baseUrl: string,
    uid: string,
    period: string,
    orgUnit: string,
    format: string
  ): string {
    const params = new URLSearchParams({
      dataElement: uid,
      period: period,
      orgUnit: orgUnit,
      format: format.toUpperCase()
    });

    return `${baseUrl}/dataValueSets?${params.toString()}`;
  }

  /**
   * Generate DHIS2 web interface URL
   */
  private static generateWebUrl(webBaseUrl: string, uid: string, type: string): string {
    const normalizedType = this.normalizeMetadataType(type);
    
    let section = '';
    switch (normalizedType) {
      case 'dataElements':
        section = 'dataElement';
        break;
      case 'indicators':
        section = 'indicator';
        break;
      case 'programIndicators':
        section = 'programIndicator';
        break;
      default:
        section = 'metadata';
    }

    return `${webBaseUrl}/#/maintenance/${section}/${uid}`;
  }

  /**
   * Generate export/download URL
   */
  private static generateExportUrl(baseUrl: string, uid: string, type: string, format: string): string {
    const normalizedType = this.normalizeMetadataType(type);
    const formatSuffix = format === 'json' ? '.json' : format === 'xml' ? '.xml' : '';
    
    return `${baseUrl}/${normalizedType}/${uid}${formatSuffix}?download=true`;
  }

  /**
   * Check if metadata type supports raw data values
   */
  private static supportsDataValues(type: string): boolean {
    const normalizedType = this.normalizeMetadataType(type);
    // Only dataElements have raw data values
    // Indicators and programIndicators are calculated/derived
    return normalizedType === 'dataElements';
  }

  /**
   * Normalize metadata type to standard format
   */
  private static normalizeMetadataType(type: string): string {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('dataelement') || lowerType.includes('data_element')) {
      return 'dataElements';
    }
    if (lowerType.includes('indicator') && !lowerType.includes('program')) {
      return 'indicators';
    }
    if (lowerType.includes('program') && lowerType.includes('indicator')) {
      return 'programIndicators';
    }
    if (lowerType.includes('organisationunit') || lowerType.includes('orgunit')) {
      return 'organisationUnits';
    }
    
    // Return as-is for unknown types
    return type;
  }

  /**
   * Normalize base URL to ensure proper format
   */
  private static normalizeBaseUrl(url: string): string {
    url = url.trim();
    
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Ensure it ends with /api, but avoid duplication
    if (!url.endsWith('/api')) {
      if (url.endsWith('/api/')) {
        // Remove the extra slash if it ends with /api/
        url = url.slice(0, -1);
      } else if (url.includes('/api/')) {
        // Extract base URL up to /api (without trailing slash)
        url = url.substring(0, url.indexOf('/api') + 4);
      } else {
        // Add /api
        url = `${url}/api`;
      }
    }
    
    console.log(`🔧 Normalized base URL: ${url}`);
    return url;
  }

  /**
   * Generate curl command for testing the API
   */
  static generateCurlCommand(url: string, username?: string, password?: string): string {
    const authPart = username && password 
      ? `-u "${username}:${password}"` 
      : '-H "Authorization: Basic $(echo -n \'username:password\' | base64)"';
    
    return `curl ${authPart} \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  "${url}"`;
  }

  /**
   * Validate API URL format
   */
  static validateApiUrl(url: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('URL is required');
      return { valid: false, errors };
    }
    
    try {
      const parsedUrl = new URL(url);
      
      if (!parsedUrl.protocol.startsWith('http')) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
      
      if (!parsedUrl.pathname.includes('/api/')) {
        errors.push('URL must contain /api/ path');
      }
      
    } catch (error) {
      errors.push('Invalid URL format');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Extract variable UID from various API URL formats
   */
  static extractVariableUid(apiUrl: string): string | null {
    try {
      // Pattern for analytics API: dimension=dx:UID
      const analyticsMatch = apiUrl.match(/dimension=dx:([a-zA-Z0-9]+)/);
      if (analyticsMatch) {
        return analyticsMatch[1];
      }
      
      // Pattern for metadata API: /dataElements/UID or /indicators/UID
      const metadataMatch = apiUrl.match(/\/(?:dataElements|indicators|programIndicators)\/([a-zA-Z0-9]+)/);
      if (metadataMatch) {
        return metadataMatch[1];
      }
      
      // Pattern for dataValueSets: dataElement=UID
      const dataValuesMatch = apiUrl.match(/dataElement=([a-zA-Z0-9]+)/);
      if (dataValuesMatch) {
        return dataValuesMatch[1];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
} 