import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBagIcon, MagnifyingGlassIcon, TagIcon, WrenchScrewdriverIcon,
  CubeIcon, TruckIcon, CurrencyRupeeIcon, UserCircleIcon, ClipboardDocumentListIcon,
  MapPinIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon, XCircleIcon,
  MicrophoneIcon, CameraIcon, AdjustmentsHorizontalIcon, ArrowRightIcon,
  StarIcon, HeartIcon, ChartBarIcon, FireIcon, ShieldCheckIcon, SignalIcon, CogIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import marketplaceAPI from '../services/marketplaceAPI'
import { useAuth } from '../contexts/AuthContext'

const tabConfig = [
  { key: 'explore', label: 'Explore Market', icon: ShoppingBagIcon },
  { key: 'sell', label: 'Sell Items', icon: PlusCircleIcon },
  { key: 'orders', label: 'Orders', icon: ClipboardDocumentListIcon }
]

const categoryFilters = [
  { key: 'all', label: 'All' },
  { key: 'bike', label: 'Bikes' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'part', label: 'Parts' }
]

const marketTypeFilters = [
  { key: 'all', label: 'All Types' },
  { key: 'retail', label: 'Store Products' },
  { key: 'resale', label: 'Resale (OLX style)' }
]

const Marketplace = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('explore')
  const [query, setQuery] = useState('')
  const [itemKind, setItemKind] = useState('all')
  const [marketType, setMarketType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const [exploreListings, setExploreListings] = useState([])
  const [myListings, setMyListings] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])

  const [placingOrderId, setPlacingOrderId] = useState(null)

  const [sellForm, setSellForm] = useState({
    title: '',
    description: '',
    price: '',
    marketType: 'resale',
    itemKind: 'accessory',
    subType: '',
    condition: 'good',
    quantity: 1,
    negotiable: false,
    city: '',
    state: '',
    address: '',
    tags: ''
  })

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [exploreRes, myListingsRes, myOrdersRes, sellerOrdersRes] = await Promise.all([
        marketplaceAPI.getListings({ type: 'product', q: query, itemKind, marketType }),
        marketplaceAPI.getMyListings(),
        marketplaceAPI.getMyOrders(),
        marketplaceAPI.getSellerOrders()
      ])

      setExploreListings(exploreRes?.data || [])
      setMyListings(myListingsRes?.data || [])
      setMyOrders(myOrdersRes?.data || [])
      setSellerOrders(sellerOrdersRes?.data || [])
    } catch (e) {
      setError(e?.response?.data?.error || 'Marketplace data load failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await marketplaceAPI.getListings({ type: 'product', q: query, itemKind, marketType })
        setExploreListings(res?.data || [])
      } catch (e) {
        setExploreListings([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, itemKind, marketType])

  const handleCreateListing = async () => {
    if (!sellForm.title.trim() || sellForm.price === '') {
      setNotice('Title and price are required.')
      return
    }

    try {
      setNotice('')
      await marketplaceAPI.createListing({
        ...sellForm,
        price: Number(sellForm.price),
        quantity: Number(sellForm.quantity) || 1
      })

      setNotice('Listing posted successfully.')
      setSellForm({
        title: '',
        description: '',
        price: '',
        marketType: 'resale',
        itemKind: 'accessory',
        subType: '',
        condition: 'good',
        quantity: 1,
        negotiable: false,
        city: '',
        state: '',
        address: '',
        tags: ''
      })
      await loadData()
      setActiveTab('sell')
    } catch (e) {
      setNotice(e?.response?.data?.error || 'Failed to create listing.')
    }
  }

  const handleDeleteListing = async (listingId) => {
    try {
      setNotice('')
      await marketplaceAPI.deleteListing(listingId)
      setNotice('Listing removed.')
      await loadData()
    } catch (e) {
      setNotice(e?.response?.data?.error || 'Could not remove listing.')
    }
  }

  const handlePlaceOrder = async (listingId) => {
    try {
      setPlacingOrderId(listingId)
      setNotice('')
      await marketplaceAPI.placeOrder({ listingId, quantity: 1 })
      setNotice('Order placed successfully.')
      await loadData()
      setActiveTab('orders')
    } catch (e) {
      setNotice(e?.response?.data?.error || 'Order placement failed.')
    } finally {
      setPlacingOrderId(null)
    }
  }

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      setNotice('')
      await marketplaceAPI.updateOrderStatus(orderId, status)
      setNotice(`Order marked as ${status}.`)
      await loadData()
    } catch (e) {
      setNotice(e?.response?.data?.error || 'Could not update order status.')
    }
  }

  const mergedOrderList = useMemo(() => {
    return {
      my: myOrders,
      seller: sellerOrders
    }
  }, [myOrders, sellerOrders])
  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F7] font-sans pb-32 relative overflow-x-hidden selection:bg-[#B08968]/30 pt-20">
      
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1C1C1E]/50 via-[#0A0A0A] to-[#050505]"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        
        {/* ========================================= */}
        {/* PREMIUM HEADER & SEARCH */}
        {/* ========================================= */}
        <div className="flex flex-col items-center text-center space-y-8 pt-8 pb-16 border-b border-[rgba(255,255,255,0.05)]">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md">
            Marketplace
          </h1>
          
          <div className="flex flex-col items-center gap-6 mt-6">
            <div className="flex gap-4 p-1.5 rounded-full bg-[#121212] border border-[rgba(255,255,255,0.1)] shadow-2xl">
              <button onClick={() => setActiveTab('explore')} className={`px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'explore' ? 'bg-[#1C1C1E] text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)]' : 'bg-transparent text-[#86868B] hover:text-white'}`}>Explore</button>
              <button onClick={() => setActiveTab('sell')} className={`px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'sell' ? 'bg-[#1C1C1E] text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)]' : 'bg-transparent text-[#86868B] hover:text-white'}`}>Sell</button>
              <button onClick={() => setActiveTab('orders')} className={`px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-[#1C1C1E] text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)]' : 'bg-transparent text-[#86868B] hover:text-white'}`}>Orders</button>
            </div>
            
            <div className="bg-[#B08968]/10 border border-[#B08968]/20 rounded-2xl p-4 flex items-center gap-3 text-[#F5F5F7] max-w-2xl text-left">
              <ShieldCheckIcon className="w-6 h-6 text-[#B08968] flex-shrink-0" />
              <div className="text-xs font-medium leading-relaxed">
                <strong className="text-[#B08968]">Development Notice:</strong> This Marketplace is currently running on mock simulated data. Full backend integration is in progress and will be fully functional in upcoming updates!
              </div>
            </div>
          </div>

          {activeTab === 'explore' && (
            <div className="w-full max-w-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#B08968]/20 to-[#8C6D53]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative flex items-center bg-[#121212]/90 backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] rounded-full p-2 shadow-2xl">
                <div className="pl-6 pr-4 text-[#86868B]">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search gear, bikes, accessories..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-[#86868B] py-3 text-sm font-medium"
                />
                <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[#86868B] hover:text-white mr-2">
                  <AdjustmentsHorizontalIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* NOTICES & LOADING */}
        {/* ========================================= */}
        <div className="pt-8">
          {error && (
            <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 text-sm text-red-400 flex items-center gap-3 shadow-lg max-w-2xl mx-auto">
              <XCircleIcon className="w-5 h-5" /> {error}
            </div>
          )}
          {notice && (
            <div className="mb-8 rounded-2xl border border-green-500/20 bg-green-500/5 px-6 py-4 text-sm text-green-400 flex items-center gap-3 shadow-lg max-w-2xl mx-auto">
              <CheckCircleIcon className="w-5 h-5" /> {notice}
            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* TAB ROUTING */}
        {/* ========================================= */}

        {/* --- EXPLORE MARKET (MAIN) --- */}
        {activeTab === 'explore' && (
          <div className="space-y-16 pb-20 pt-8">
            
            {/* Minimalist Categories */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 justify-start lg:justify-center">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'bike', label: 'Motorcycles' },
                { id: 'accessory', label: 'Accessories' },
                { id: 'gear', label: 'Riding Gear' },
                { id: 'part', label: 'Parts' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setItemKind(cat.id)}
                  className={`flex-shrink-0 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    itemKind === cat.id 
                      ? 'bg-gradient-to-r from-[#B08968]/20 to-[#8C6D53]/20 text-[#B08968] border border-[#B08968]/40 shadow-[0_0_20px_rgba(176,137,104,0.2)]' 
                      : 'bg-transparent text-[#86868B] hover:text-white border border-[rgba(255,255,255,0.1)] hover:bg-[#121212]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#B08968]/30 border-t-[#B08968] rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Loading Catalog...</p>
              </div>
            ) : exploreListings.length === 0 ? (
              // Empty State
              <div className="py-32 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 mb-8 opacity-10">
                  <ShoppingBagIcon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Items Found</h3>
                <p className="text-[#86868B] text-sm max-w-sm mb-8">Try adjusting your filters or search terms.</p>
                <button onClick={() => {setQuery(''); setItemKind('all')}} className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-[rgba(255,255,255,0.1)] text-white font-bold text-sm transition-all">
                  Clear Filters
                </button>
              </div>
            ) : (
              // Clean Apple-Style Grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {exploreListings.map(listing => (
                  <div key={listing.id} className="group cursor-pointer">
                    
                    {/* Image Container */}
                    <div className="relative h-80 rounded-[32px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] overflow-hidden mb-6 transition-all duration-500 group-hover:border-[rgba(255,255,255,0.2)] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                      
                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 z-20">
                        {listing.marketType === 'resale' ? (
                          <span className="px-3 py-1.5 rounded-full bg-[#121212]/80 border border-white/10 text-[#86868B] text-[9px] font-bold uppercase tracking-widest backdrop-blur-md">Resale</span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-full bg-[#B08968]/20 border border-[#B08968]/30 text-[#B08968] text-[9px] font-bold uppercase tracking-widest backdrop-blur-md">Retail</span>
                        )}
                      </div>
                      <button className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#121212]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#86868B] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                         <HeartIcon className="w-5 h-5" />
                      </button>

                      {/* Image */}
                      <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700">
                         {listing.images && listing.images.length > 0 ? (
                           <img src={listing.images[0]} className="w-full h-full object-cover" />
                         ) : (
                           <img src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" />
                         )}
                      </div>
                    </div>
                    
                    {/* Content Section - Minimalist */}
                    <div className="px-2">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-[#B08968] transition-colors">{listing.title}</h3>
                        <span className="text-lg font-black text-[#F5F5F7] whitespace-nowrap">₹{listing.price.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-[#86868B] line-clamp-1">{listing.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#86868B] font-medium">
                          <span className="capitalize">{listing.condition}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {listing.city || 'Global'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- SELL PRODUCT (NO CHANGES TO FORM LAYOUT) --- */}
        {activeTab === 'sell' && (
           <div className="max-w-3xl mx-auto py-12">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">List an Item</h2>
              {renderSellForm()}
           </div>
        )}

        {/* --- ORDERS (NO CHANGES TO ORDERS LAYOUT) --- */}
        {activeTab === 'orders' && (
           <div className="max-w-4xl mx-auto py-12">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">Your Orders</h2>
              {renderOrdersList()}
           </div>
        )}

      </div>
    </div>
  )
}

export default Marketplace;
