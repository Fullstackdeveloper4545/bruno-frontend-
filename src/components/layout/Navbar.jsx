import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/Logo.png'
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react'
import { cartEvents, getCartCount } from '../../lib/cart'
import { getJson } from '../../lib/api'

const fallbackCategories = [
    { id: 'fallback-1', title: 'Sapatilhas' },
    { id: 'fallback-2', title: 'Roupa' },
    { id: 'fallback-3', title: 'Relogios GPS' },
    { id: 'fallback-4', title: 'Equipamento de Corrida' },
    { id: 'fallback-5', title: 'Nutricao Desportiva' },
    { id: 'fallback-6', title: 'Hyrox' },
]

function buildCategoryLink(category, index) {
    const categoryId = category?.id != null ? String(category.id) : `category-${index}`
    const categoryTitle = category?.name_pt || category?.name_es || category?.slug || `Categoria ${index + 1}`
    return {
        id: categoryId,
        title: categoryTitle,
        to: `/products?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent(categoryTitle)}`,
    }
}

const Navbar = () => {
    const [open, setOpen] = useState(false)
    const [cartCount, setCartCount] = useState(0)
    const [categories, setCategories] = useState([])

    useEffect(() => {
        const syncCartCount = () => setCartCount(getCartCount())
        syncCartCount()
        window.addEventListener('storage', syncCartCount)
        window.addEventListener(cartEvents.updated, syncCartCount)
        return () => {
            window.removeEventListener('storage', syncCartCount)
            window.removeEventListener(cartEvents.updated, syncCartCount)
        }
    }, [])

    useEffect(() => {
        let active = true

        const loadCategories = async () => {
            try {
                const response = await getJson('/api/catalog/categories')
                if (!active || !Array.isArray(response)) return

                const nextCategories = response
                    .filter((category) => category?.is_active !== false)
                    .sort((a, b) => {
                        const left = Number(b?.product_count || 0)
                        const right = Number(a?.product_count || 0)
                        return left - right
                    })
                    .slice(0, 8)
                    .map(buildCategoryLink)

                setCategories(nextCategories)
            } catch {
                if (!active) return
                setCategories([])
            }
        }

        void loadCategories()

        return () => {
            active = false
        }
    }, [])

    const navCategories = useMemo(() => {
        return categories.length > 0 ? categories : fallbackCategories.map(buildCategoryLink)
    }, [categories])

    return (
        <>
            <header>
                <nav>
                    <div className='bg-black text-white p-2 text-center text-[12px]'>
                        Ofertas e Informacoes Saldos
                    </div>
                    <div className='flex w-full justify-between items-center px-4 md:px-16 py-2'>
                        <div className='hidden md:flex w-2/12 justify-evenly'>
                            <Link to='/about-us' className=''>About Us</Link>
                            <Link to='/blog'>Blog</Link>
                            <Link to='/contact'>Contacts</Link>
                        </div>
                        <div className='w-4/12 md:w-1/12 flex justify-center'>
                            <img src={logo} alt='Logo' className='h-8 md:h-10 object-contain' />
                        </div>
                        <div className='hidden md:flex w-1/12 justify-between'>
                            <Search />
                            <User />
                            <Link to='/cart' className='relative' aria-label='Open cart'>
                                <ShoppingCart />
                                {cartCount > 0 ? (
                                    <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-black text-white text-[10px] px-1 flex items-center justify-center'>
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                ) : null}
                            </Link>
                        </div>
                        <button
                            className='md:hidden'
                            onClick={() => setOpen((v) => !v)}
                            aria-label='Toggle menu'
                        >
                            {open ? <X /> : <Menu />}
                        </button>
                    </div>
                    <div className='hidden md:flex flex-wrap justify-center gap-x-8 gap-y-3 py-6 border-t border-gray-300 px-6'>
                        {navCategories.map((category) => (
                            <Link key={category.id} to={category.to} className='focus:text-red-500 whitespace-nowrap'>
                                {category.title}
                            </Link>
                        ))}
                    </div>

                    {open && (
                        <div className='md:hidden border-t border-gray-300 px-4 py-4 space-y-4'>
                            <div className='flex gap-6'>
                                <Search />
                                <User />
                                <Link to='/cart' className='relative' aria-label='Open cart' onClick={() => setOpen(false)}>
                                    <ShoppingCart />
                                    {cartCount > 0 ? (
                                        <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-black text-white text-[10px] px-1 flex items-center justify-center'>
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </span>
                                    ) : null}
                                </Link>
                            </div>
                            <div className='flex flex-col gap-3'>
                                <Link to='/about-us' onClick={() => setOpen(false)}>About Us</Link>
                                <Link to='/blog' onClick={() => setOpen(false)}>Blog</Link>
                                <Link to='/contact' onClick={() => setOpen(false)}>Contacts</Link>
                            </div>
                            <details className='pt-2 border-t border-gray-300'>
                                <summary className='cursor-pointer select-none list-none font-medium'>
                                    Categorias
                                </summary>
                                <div className='mt-3 flex flex-col gap-3'>
                                    {navCategories.map((category) => (
                                        <Link key={category.id} to={category.to} onClick={() => setOpen(false)}>
                                            {category.title}
                                        </Link>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                </nav>
            </header>
        </>
    )
}

export default Navbar
