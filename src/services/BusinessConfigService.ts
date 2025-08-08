import { BusinessInfo, DocumentSettings } from '../types/documents';
import { StorageService } from './StorageService';

export class BusinessConfigService {
  private static instance: BusinessConfigService;
  private storage: StorageService;
  private readonly BUSINESS_INFO_KEY = 'business_info';
  private readonly DOCUMENT_SETTINGS_KEY = 'document_settings';

  private constructor() {
    this.storage = StorageService.getInstance();
  }

  public static getInstance(): BusinessConfigService {
    if (!BusinessConfigService.instance) {
      BusinessConfigService.instance = new BusinessConfigService();
    }
    return BusinessConfigService.instance;
  }

  // Business Information Management
  async getBusinessInfo(): Promise<BusinessInfo> {
    try {
      const businessInfo = await this.storage.getItem(this.BUSINESS_INFO_KEY);
      
      if (businessInfo) {
        return JSON.parse(businessInfo);
      }

      // Return default business info if none exists
      return this.getDefaultBusinessInfo();
    } catch (error) {
      console.error('Failed to get business info:', error);
      return this.getDefaultBusinessInfo();
    }
  }

  async updateBusinessInfo(businessInfo: Partial<BusinessInfo>): Promise<BusinessInfo> {
    try {
      const currentInfo = await this.getBusinessInfo();
      const updatedInfo: BusinessInfo = {
        ...currentInfo,
        ...businessInfo,
        // Deep merge nested objects
        address: { ...currentInfo.address, ...businessInfo.address },
        contact: { ...currentInfo.contact, ...businessInfo.contact },
        tax: { ...currentInfo.tax, ...businessInfo.tax },
        branding: { ...currentInfo.branding, ...businessInfo.branding },
      };

      await this.storage.setItem(this.BUSINESS_INFO_KEY, JSON.stringify(updatedInfo));
      
      console.log('✅ Business information updated successfully');
      return updatedInfo;
    } catch (error) {
      console.error('Failed to update business info:', error);
      throw new Error('Failed to update business information');
    }
  }

  // Document Settings Management
  async getDocumentSettings(): Promise<DocumentSettings> {
    try {
      const settings = await this.storage.getItem(this.DOCUMENT_SETTINGS_KEY);
      
      if (settings) {
        return JSON.parse(settings);
      }

      // Return default settings if none exist
      return this.getDefaultDocumentSettings();
    } catch (error) {
      console.error('Failed to get document settings:', error);
      return this.getDefaultDocumentSettings();
    }
  }

  async updateDocumentSettings(settings: Partial<DocumentSettings>): Promise<DocumentSettings> {
    try {
      const currentSettings = await this.getDocumentSettings();
      const updatedSettings: DocumentSettings = {
        ...currentSettings,
        ...settings,
        // Deep merge nested objects
        defaultTemplate: { ...currentSettings.defaultTemplate, ...settings.defaultTemplate },
        numbering: { ...currentSettings.numbering, ...settings.numbering },
        defaultTerms: { ...currentSettings.defaultTerms, ...settings.defaultTerms },
        emailSettings: {
          ...currentSettings.emailSettings,
          ...settings.emailSettings,
          templates: {
            ...currentSettings.emailSettings.templates,
            ...settings.emailSettings?.templates,
          },
        },
        smsSettings: {
          ...currentSettings.smsSettings,
          ...settings.smsSettings,
          templates: {
            ...currentSettings.smsSettings.templates,
            ...settings.smsSettings?.templates,
          },
        },
      };

      await this.storage.setItem(this.DOCUMENT_SETTINGS_KEY, JSON.stringify(updatedSettings));
      
      console.log('✅ Document settings updated successfully');
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update document settings:', error);
      throw new Error('Failed to update document settings');
    }
  }

  // Document Numbering
  async getNextReceiptNumber(): Promise<string> {
    try {
      const settings = await this.getDocumentSettings();
      const nextNumber = settings.numbering.receiptNextNumber;
      const prefix = settings.numbering.receiptPrefix;
      
      // Update the next number
      await this.updateDocumentSettings({
        numbering: {
          ...settings.numbering,
          receiptNextNumber: nextNumber + 1,
        },
      });

      return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Failed to generate receipt number:', error);
      throw new Error('Failed to generate receipt number');
    }
  }

  async getNextInvoiceNumber(): Promise<string> {
    try {
      const settings = await this.getDocumentSettings();
      const nextNumber = settings.numbering.invoiceNextNumber;
      const prefix = settings.numbering.invoicePrefix;
      
      // Update the next number
      await this.updateDocumentSettings({
        numbering: {
          ...settings.numbering,
          invoiceNextNumber: nextNumber + 1,
        },
      });

      return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Failed to generate invoice number:', error);
      throw new Error('Failed to generate invoice number');
    }
  }

  // Utility Methods
  async resetBusinessInfo(): Promise<void> {
    try {
      await this.storage.removeItem(this.BUSINESS_INFO_KEY);
      console.log('✅ Business information reset to defaults');
    } catch (error) {
      console.error('Failed to reset business info:', error);
      throw new Error('Failed to reset business information');
    }
  }

  async resetDocumentSettings(): Promise<void> {
    try {
      await this.storage.removeItem(this.DOCUMENT_SETTINGS_KEY);
      console.log('✅ Document settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset document settings:', error);
      throw new Error('Failed to reset document settings');
    }
  }

  // Default Configuration
  private getDefaultBusinessInfo(): BusinessInfo {
    return {
      id: 'default',
      name: 'SalesMVP Demo Store',
      address: {
        street: '123 Business St',
        city: 'Commerce City',
        state: 'CA',
        zipCode: '90210',
        country: 'United States',
      },
      contact: {
        phone: '(555) 123-4567',
        email: 'info@salesmvp.com',
        website: 'www.salesmvp.com',
      },
      tax: {
        registrationNumber: 'REG123456789',
        taxIdNumber: 'TAX987654321',
        gstNumber: 'GST555888999',
      },
      branding: {
        logoUrl: undefined,
        primaryColor: '#2c3e50',
        secondaryColor: '#3498db',
        accentColor: '#27ae60',
      },
    };
  }

  private getDefaultDocumentSettings(): DocumentSettings {
    return {
      defaultTemplate: {
        receipt: 'default_receipt',
        invoice: 'default_invoice',
      },
      
      numbering: {
        receiptPrefix: 'REC',
        invoicePrefix: 'INV',
        receiptNextNumber: 1,
        invoiceNextNumber: 1,
        resetPeriod: 'yearly',
      },
      
      defaultTerms: {
        paymentDays: 30,
        paymentTerms: 'Net 30 days',
        returnPolicy: 'Items may be returned within 30 days with receipt.',
        termsAndConditions: 'All sales are subject to our standard terms and conditions.',
      },
      
      emailSettings: {
        fromName: 'SalesMVP Demo Store',
        fromEmail: 'receipts@salesmvp.com',
        replyTo: 'support@salesmvp.com',
        templates: {
          receipt: {
            subject: 'Your Receipt from {{businessName}} - {{receiptNumber}}',
            body: `Dear {{customerName}},

Thank you for your purchase! Please find your receipt attached.

Transaction Details:
- Receipt Number: {{receiptNumber}}
- Date: {{date}}
- Total: {{total}}

If you have any questions, please don't hesitate to contact us.

Best regards,
{{businessName}}`,
          },
          invoice: {
            subject: 'Invoice {{invoiceNumber}} from {{businessName}}',
            body: `Dear {{customerName}},

Please find your invoice attached.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Date: {{invoiceDate}}
- Due Date: {{dueDate}}
- Amount: {{total}}

Please remit payment by the due date. If you have any questions, please contact us.

Best regards,
{{businessName}}`,
          },
        },
      },
      
      smsSettings: {
        enabled: false,
        provider: 'twilio',
        fromNumber: '',
        templates: {
          receipt: 'Thank you for shopping at {{businessName}}! Your receipt #{{receiptNumber}} for ${{total}} has been sent to your email.',
          invoice: 'Invoice {{invoiceNumber}} for ${{total}} from {{businessName}} is due on {{dueDate}}. Please check your email for details.',
        },
      },
    };
  }

  // Business Information Validation
  validateBusinessInfo(businessInfo: Partial<BusinessInfo>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (businessInfo.name && businessInfo.name.trim().length < 2) {
      errors.push('Business name must be at least 2 characters long');
    }

    if (businessInfo.contact?.email && !this.isValidEmail(businessInfo.contact.email)) {
      errors.push('Invalid email address');
    }

    if (businessInfo.contact?.phone && businessInfo.contact.phone.length < 10) {
      errors.push('Phone number must be at least 10 digits');
    }

    // Validate colors if provided
    if (businessInfo.branding?.primaryColor && !this.isValidHexColor(businessInfo.branding.primaryColor)) {
      errors.push('Primary color must be a valid hex color');
    }

    if (businessInfo.branding?.secondaryColor && !this.isValidHexColor(businessInfo.branding.secondaryColor)) {
      errors.push('Secondary color must be a valid hex color');
    }

    if (businessInfo.branding?.accentColor && !this.isValidHexColor(businessInfo.branding.accentColor)) {
      errors.push('Accent color must be a valid hex color');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper Methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  // Export/Import Configuration
  async exportConfiguration(): Promise<{ businessInfo: BusinessInfo; documentSettings: DocumentSettings }> {
    try {
      const businessInfo = await this.getBusinessInfo();
      const documentSettings = await this.getDocumentSettings();

      return {
        businessInfo,
        documentSettings,
      };
    } catch (error) {
      console.error('Failed to export configuration:', error);
      throw new Error('Failed to export configuration');
    }
  }

  async importConfiguration(config: { 
    businessInfo?: Partial<BusinessInfo>; 
    documentSettings?: Partial<DocumentSettings>; 
  }): Promise<void> {
    try {
      if (config.businessInfo) {
        await this.updateBusinessInfo(config.businessInfo);
      }

      if (config.documentSettings) {
        await this.updateDocumentSettings(config.documentSettings);
      }

      console.log('✅ Configuration imported successfully');
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Failed to import configuration');
    }
  }
}

// Export singleton instance
export const businessConfigService = BusinessConfigService.getInstance();
