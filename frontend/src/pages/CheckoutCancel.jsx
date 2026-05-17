import { Link } from 'react-router-dom'

export default function CheckoutCancel() {
  return (
    <div className="max-w-md mx-auto card p-8 text-center mt-10">
      <div className="text-6xl mb-4">😕</div>
      <h1 className="text-2xl font-bold">Payment cancelled</h1>
      <p className="text-slate-600 mt-2">Your cart is still saved.</p>
      <Link to="/cart" className="btn-primary mt-6 inline-block">Back to cart</Link>
    </div>
  )
}
