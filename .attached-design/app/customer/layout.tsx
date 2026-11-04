import { CartButton, CartProvider } from '@/components/customer/cart-provider'
import { AppShell } from '@/components/shell/app-shell'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <AppShell role="customer" topbarActions={<CartButton />}>
        {children}
      </AppShell>
    </CartProvider>
  )
}
