import { database } from '../stores/DatabaseFactory';
import { Product, CreateProductInput, UpdateProductInput } from '../types';

export class ProductService {
  private static instance: ProductService;

  private constructor() {}

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Get all products with optional search filter
   */
  public async getAllProducts(searchTerm?: string): Promise<Product[]> {
    try {
      const allProducts = await database.getAllProducts();
      
      if (!searchTerm) {
        return allProducts;
      }

      // Filter products based on search term (name, SKU, or partial matches)
      const searchLower = searchTerm.toLowerCase();
      return allProducts.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Failed to get products:', error);
      throw new Error('Failed to load products');
    }
  }

  /**
   * Get product by ID
   */
  public async getProduct(id: number): Promise<Product | null> {
    try {
      return await database.getProduct(id);
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Failed to load product');
    }
  }

  /**
   * Get product by SKU
   */
  public async getProductBySku(sku: string): Promise<Product | null> {
    try {
      return await database.getProductBySku(sku);
    } catch (error) {
      console.error('Failed to get product by SKU:', error);
      throw new Error('Failed to load product');
    }
  }

  /**
   * Create new product with validation
   */
  public async createProduct(input: CreateProductInput): Promise<Product> {
    try {
      // Validate input
      this.validateProductInput(input);

      // Check if SKU already exists
      const existingProduct = await database.getProductBySku(input.sku);
      if (existingProduct) {
        throw new Error(`Product with SKU "${input.sku}" already exists`);
      }

      // Create product
      const product = await database.createProduct(input);
      console.log(`✅ Product created: ${product.name} (${product.sku})`);
      return product;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Update existing product
   */
  public async updateProduct(input: UpdateProductInput): Promise<Product> {
    try {
      // Check if product exists
      const existingProduct = await database.getProduct(input.id);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // If updating SKU, check it doesn't conflict with another product
      if (input.sku && input.sku !== existingProduct.sku) {
        const conflictingProduct = await database.getProductBySku(input.sku);
        if (conflictingProduct && conflictingProduct.id !== input.id) {
          throw new Error(`SKU "${input.sku}" is already in use`);
        }
      }

      // Update product
      const updatedProduct = await database.updateProduct(input);
      console.log(`✅ Product updated: ${updatedProduct.name} (${updatedProduct.sku})`);
      return updatedProduct;
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  public async deleteProduct(id: number): Promise<boolean> {
    try {
      const product = await database.getProduct(id);
      if (!product) {
        throw new Error('Product not found');
      }

      const success = await database.deleteProduct(id);
      if (success) {
        console.log(`✅ Product deleted: ${product.name} (${product.sku})`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }

  /**
   * Update product stock quantity
   */
  public async updateStock(id: number, newQuantity: number): Promise<Product> {
    try {
      if (newQuantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }

      return await this.updateProduct({
        id,
        stock_qty: newQuantity
      });
    } catch (error) {
      console.error('Failed to update stock:', error);
      throw error;
    }
  }

  /**
   * Get low stock products (less than specified threshold)
   */
  public async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const allProducts = await database.getAllProducts();
      return allProducts.filter(product => product.stock_qty <= threshold);
    } catch (error) {
      console.error('Failed to get low stock products:', error);
      throw new Error('Failed to load low stock products');
    }
  }

  /**
   * Get products by category (based on SKU prefix)
   */
  public async getProductsByCategory(categoryPrefix: string): Promise<Product[]> {
    try {
      const allProducts = await database.getAllProducts();
      return allProducts.filter(product => 
        product.sku.toUpperCase().startsWith(categoryPrefix.toUpperCase())
      );
    } catch (error) {
      console.error('Failed to get products by category:', error);
      throw new Error('Failed to load products by category');
    }
  }

  /**
   * Generate next SKU for a category
   */
  public async generateNextSku(categoryPrefix: string): Promise<string> {
    try {
      const categoryProducts = await this.getProductsByCategory(categoryPrefix);
      const numbers = categoryProducts
        .map(p => {
          const match = p.sku.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        })
        .filter(num => num > 0);

      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      return `${categoryPrefix.toUpperCase()}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Failed to generate SKU:', error);
      throw new Error('Failed to generate SKU');
    }
  }

  /**
   * Get product statistics
   */
  public async getProductStats(): Promise<{
    totalProducts: number;
    totalValue: number;
    averagePrice: number;
    lowStockCount: number;
    categories: { [key: string]: number };
  }> {
    try {
      const allProducts = await database.getAllProducts();
      const lowStockProducts = await this.getLowStockProducts();

      const totalValue = allProducts.reduce((sum, product) => 
        sum + (product.price * product.stock_qty), 0
      );

      const averagePrice = allProducts.length > 0 
        ? allProducts.reduce((sum, product) => sum + product.price, 0) / allProducts.length
        : 0;

      // Group by category (first letter of SKU)
      const categories: { [key: string]: number } = {};
      allProducts.forEach(product => {
        const category = product.sku.charAt(0).toUpperCase();
        categories[category] = (categories[category] || 0) + 1;
      });

      return {
        totalProducts: allProducts.length,
        totalValue,
        averagePrice,
        lowStockCount: lowStockProducts.length,
        categories
      };
    } catch (error) {
      console.error('Failed to get product stats:', error);
      throw new Error('Failed to load product statistics');
    }
  }

  /**
   * Validate product input
   */
  private validateProductInput(input: CreateProductInput | UpdateProductInput): void {
    if ('sku' in input && input.sku) {
      if (input.sku.trim().length === 0) {
        throw new Error('SKU is required');
      }
      if (!/^[A-Z0-9]+$/i.test(input.sku)) {
        throw new Error('SKU can only contain letters and numbers');
      }
    }

    if ('name' in input && input.name) {
      if (input.name.trim().length === 0) {
        throw new Error('Product name is required');
      }
      if (input.name.length > 100) {
        throw new Error('Product name must be less than 100 characters');
      }
    }

    if ('price' in input && input.price !== undefined) {
      if (input.price < 0) {
        throw new Error('Price cannot be negative');
      }
    }

    if ('cost' in input && input.cost !== undefined) {
      if (input.cost < 0) {
        throw new Error('Cost cannot be negative');
      }
    }

    if ('stock_qty' in input && input.stock_qty !== undefined) {
      if (input.stock_qty < 0) {
        throw new Error('Stock quantity cannot be negative');
      }
    }

    if ('tax_rate' in input && input.tax_rate !== undefined) {
      if (input.tax_rate < 0 || input.tax_rate > 1) {
        throw new Error('Tax rate must be between 0 and 1');
      }
    }
  }
}

// Export singleton instance
export const productService = ProductService.getInstance();
