import { createContext, useContext, useReducer } from "react";

const CartContext = createContext(null);
const SHIPPING_COST = 15000;

function clampQuantity(quantity, stock) {
  return Math.max(1, Math.min(stock, quantity));
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, quantity } = action.payload;
      const existingItem = state.find((item) => item.id === product.id);

      if (existingItem) {
        return state.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: clampQuantity(item.quantity + quantity, item.stock),
              }
            : item,
        );
      }

      return [
        ...state,
        {
          ...product,
          quantity: clampQuantity(quantity, product.stock),
        },
      ];
    }

    case "UPDATE_ITEM": {
      const { productId, quantity } = action.payload;

      return state.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: clampQuantity(quantity, item.stock),
            }
          : item,
      );
    }

    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload.productId);

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = items.length > 0 ? SHIPPING_COST : 0;
  const total = subtotal + shipping;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    subtotal,
    shipping,
    total,
    itemCount,
    addItem(product, quantity = 1) {
      dispatch({
        type: "ADD_ITEM",
        payload: { product, quantity },
      });
    },
    updateItemQuantity(productId, quantity) {
      dispatch({
        type: "UPDATE_ITEM",
        payload: { productId, quantity },
      });
    },
    removeItem(productId) {
      dispatch({
        type: "REMOVE_ITEM",
        payload: { productId },
      });
    },
    clearCart() {
      dispatch({ type: "CLEAR_CART" });
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart harus dipakai di dalam CartProvider.");
  }

  return context;
}
