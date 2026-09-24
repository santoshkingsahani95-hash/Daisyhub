import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, WishlistItem, CustomerUser } from '@/types';

const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(name);
      if (item !== null) return item;
      return sessionStorage.getItem(name);
    } catch (e) {
      console.warn(`[Store] Failed to read "${name}" from storage:`, e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.warn(`[Store] Failed to save "${name}" to localStorage (quota exceeded or restricted):`, error);
      try {
        sessionStorage.setItem(name, value);
      } catch (sessionErr) {
        console.warn(`[Store] Failed to save "${name}" to sessionStorage:`, sessionErr);
      }
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch (error) {
      console.warn(`[Store] Failed to remove "${name}" from storage:`, error);
    }
  },
};

/**
 * Accurately calculates available stock for a product, aligning 100% with Admin Panel logic.
 * Products with total stock > 0 show IN STOCK; products with total stock = 0 show OUT OF STOCK.
 */
export function getProductStock(product: Product, colorName?: string): number {
  if (!product) return 0;
  if (product.isOutOfStock === true) return 0;

  // 1. Check sizes array first (Primary source of truth matching Admin Panel inventory)
  if (product.sizes && product.sizes.length > 0) {
    const totalSizeStock = product.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    if (totalSizeStock > 0 || !product.colors || !product.colors.some((c) => c.stock !== undefined)) {
      return Math.max(0, totalSizeStock);
    }
  }

  // 2. Check if specific target color has explicit stock defined
  if (colorName && product.colors && product.colors.length > 0) {
    const targetColor = product.colors.find((c) => c.name === colorName);
    if (targetColor && targetColor.stock !== undefined) {
      return Math.max(0, targetColor.stock);
    }
  }

  // 3. Check sum of color stocks
  const colorsWithStock = (product.colors || []).filter((c) => c.stock !== undefined);
  if (colorsWithStock.length > 0) {
    return Math.max(0, colorsWithStock.reduce((sum, c) => sum + (c.stock || 0), 0));
  }

  return 0;
}

export function isProductOutOfStock(product: Product, colorName?: string): boolean {
  if (!product) return true;
  if (product.isOutOfStock === true) return true;
  return getProductStock(product, colorName) <= 0;
}

interface StoreState {
  // Cart
  cart: CartItem[];
  directCheckoutItem: CartItem | null;
  addToCart: (product: Product, colorName: string, size: string, quantity?: number) => void;
  buyNowProduct: (product: Product, colorName: string, size: string, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  clearDirectCheckoutItem: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;

  // Mini Cart Drawer
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  toggleMiniCart: () => void;

  // Wishlist
  wishlist: WishlistItem[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

  // Quick Add Modal
  quickAddProduct: Product | null;
  openQuickAdd: (product: Product) => void;
  closeQuickAdd: () => void;

  // Size Guide Modal
  sizeGuideCategory: string | null;
  openSizeGuide: (category?: string) => void;
  closeSizeGuide: () => void;

  // Search Overlay
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  // Customer Auth
  user: CustomerUser | null;
  setUser: (user: CustomerUser | null) => void;
  switchRole: (role: 'ADMIN' | 'CUSTOMER') => void;
  logout: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Cart State
      cart: [],
      directCheckoutItem: null,
      addToCart: (product, colorName, size, quantity = 1) => {
        const maxStock = getProductStock(product, colorName);

        if (maxStock <= 0) {
          if (typeof window !== 'undefined') {
            alert(`Sorry! "${product.name}" is currently OUT OF STOCK and cannot be added to your bag.`);
          }
          return;
        }

        const color = product.colors.find((c) => c.name === colorName) || product.colors[0];
        const selectedImage = color?.images[0] || product.colors[0]?.images[0] || '';
        const price = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
        const itemId = `${product.id}-${colorName}-${size}`;

        set((state) => {
          const existingIndex = state.cart.findIndex((item) => item.id === itemId);
          if (existingIndex > -1) {
            const updated = [...state.cart];
            const currentQty = updated[existingIndex].quantity;
            const newQty = Math.min(currentQty + quantity, maxStock);
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: newQty,
            };
            return { cart: updated, isMiniCartOpen: true };
          }

          const newItem: CartItem = {
            id: itemId,
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            image: selectedImage,
            colorName: colorName || color?.name || 'Default',
            colorCode: color?.code || '#000000',
            size: size || 'Free Size',
            price: price,
            originalPrice: product.price,
            quantity: Math.min(quantity, maxStock),
            sku: product.sku,
            maxStock: maxStock,
          };

          return { cart: [...state.cart, newItem], isMiniCartOpen: true };
        });
      },

      buyNowProduct: (product, colorName, size, quantity = 1) => {
        const maxStock = getProductStock(product, colorName);

        if (maxStock <= 0) {
          if (typeof window !== 'undefined') {
            alert(`Sorry! "${product.name}" is currently OUT OF STOCK and cannot be purchased.`);
          }
          return;
        }

        const color = product.colors.find((c) => c.name === colorName) || product.colors[0];
        const selectedImage = color?.images[0] || product.colors[0]?.images[0] || '';
        const price = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
        const itemId = `direct-${product.id}-${colorName}-${size}`;

        const newItem: CartItem = {
          id: itemId,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          image: selectedImage,
          colorName: colorName || color?.name || 'Default',
          colorCode: color?.code || '#000000',
          size: size || 'Free Size',
          price: price,
          originalPrice: product.price,
          quantity: Math.min(quantity, maxStock),
          sku: product.sku,
          maxStock: maxStock,
        };

        set({ directCheckoutItem: newItem });
      },

      removeFromCart: (cartItemId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(cartItemId);
          return;
        }
        set((state) => ({
          cart: state.cart.map((item) => {
            if (item.id === cartItemId) {
              const maxAllowed = item.maxStock || 99;
              return { ...item, quantity: Math.min(quantity, maxAllowed) };
            }
            return item;
          }),
        }));
      },

      clearCart: () => set({ cart: [] }),
      clearDirectCheckoutItem: () => set({ directCheckoutItem: null }),

      getCartTotal: () => {
        return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCartItemCount: () => {
        return get().cart.reduce((count, item) => count + item.quantity, 0);
      },

      // Mini Cart Drawer
      isMiniCartOpen: false,
      openMiniCart: () => set({ isMiniCartOpen: true }),
      closeMiniCart: () => set({ isMiniCartOpen: false }),
      toggleMiniCart: () => set((state) => ({ isMiniCartOpen: !state.isMiniCartOpen })),

      // Wishlist
      wishlist: [],
      toggleWishlist: (product) => {
        set((state) => {
          const exists = state.wishlist.some((item) => item.productId === product.id);
          if (exists) {
            return {
              wishlist: state.wishlist.filter((item) => item.productId !== product.id),
            };
          }
          const newItem: WishlistItem = {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.colors[0]?.images[0] || '',
            price: product.price,
            salePrice: product.salePrice,
            category: product.category,
            colors: product.colors.map((c) => c.name),
          };
          return { wishlist: [...state.wishlist, newItem] };
        });
      },

      isInWishlist: (productId) => {
        return get().wishlist.some((item) => item.productId === productId);
      },

      // Quick Add Modal
      quickAddProduct: null,
      openQuickAdd: (product) => set({ quickAddProduct: product }),
      closeQuickAdd: () => set({ quickAddProduct: null }),

      // Size Guide Modal
      sizeGuideCategory: null,
      openSizeGuide: (category = 'general') => set({ sizeGuideCategory: category }),
      closeSizeGuide: () => set({ sizeGuideCategory: null }),

      // Search Overlay
      isSearchOpen: false,
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false }),

      // Customer Auth
      user: null,

      setUser: (user) => set({ user }),

      switchRole: (role) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, role } });
        } else {
          set({
            user: {
              id: `user-${Date.now()}`,
              name: role === 'ADMIN' ? 'Admin Manager' : 'Aayusha Karki',
              email: role === 'ADMIN' ? 'admin@acegarment.com' : 'customer@example.com',
              role,
              registrationDate: new Date().toISOString(),
            },
          });
        }
      },

      logout: () => set({ user: null }),
    }),
    {
      name: 'ace-garment-storage',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        cart: state.cart,
        directCheckoutItem: state.directCheckoutItem,
        wishlist: state.wishlist,
        user: state.user,
      }),
    }
  )
);
