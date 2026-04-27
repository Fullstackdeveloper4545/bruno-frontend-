import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/Logo.png'
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react'
import { cartEvents, getCartCount } from '../../lib/cart'
import { getJson, resolveAssetUrl } from '../../lib/api'
import { THEME_UPDATED_EVENT } from '../../lib/theme'

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
    const [logoSrc, setLogoSrc] = useState(logo)

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

    useEffect(() => {
        let active = true
        const controller = new AbortController()

        const applyLogo = (settings) => {
            const resolved = resolveAssetUrl(settings?.public_logo_url || '')
            setLogoSrc(resolved || logo)
        }

        const loadTheme = async () => {
            try {
                const settings = await getJson('/api/system/theme', { signal: controller.signal })
                if (!active) return
                applyLogo(settings)
            } catch (error) {
                if (!active || error?.name === 'AbortError') return
            }
        }

        const onThemeUpdated = (event) => {
            const payload = event?.detail?.settings ?? event?.detail ?? null
            if (!payload) return
            applyLogo(payload)
        }

        void loadTheme()
        window.addEventListener(THEME_UPDATED_EVENT, onThemeUpdated)

        return () => {
            active = false
            controller.abort()
            window.removeEventListener(THEME_UPDATED_EVENT, onThemeUpdated)
        }
    }, [])

    return (
        <>
            <header>
                <nav>
                    <div className='bg-primary text-primary-foreground p-2 text-center text-[12px]'>
                        Ofertas e Informacoes Saldos
                    </div>
                    <div className='mx-auto flex w-full max-w-[1380px] items-center justify-between gap-3 px-4 py-3 md:px-8 lg:px-16'>
                        <div className='hidden flex-1 items-center gap-6 md:flex'>
                            <Link to='/about-us' className=''>About Us</Link>
                            <Link to='/blog'>Blog</Link>
                            <Link to='/contact'>Contacts</Link>
                        </div>
                        <div className='flex min-w-0 flex-1 items-center justify-center md:flex-none'>
                            <Link to='/' aria-label='Go to homepage' className='flex items-center justify-center'>
                                <img
                                    src={logoSrc}
                                    alt='Logo'
                                    className='h-8 w-auto object-contain md:h-10'
                                    data-theme-image='public_logo_url'
                                    data-theme-image-label='Logo'
                                    onError={() => setLogoSrc(logo)}
                                />
                            </Link>
                        </div>
                        <div className='hidden flex-1 items-center justify-end gap-4 md:flex'>
                            <Search />
                            <User />
                            <Link to='/cart' className='relative' aria-label='Open cart'>
                                <ShoppingCart />
                                {cartCount > 0 ? (
                                    <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] px-1 flex items-center justify-center'>
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                ) : null}
                            </Link>
                        </div>
                        <div className='flex items-center gap-3 md:hidden'>
                            <Link to='/cart' className='relative' aria-label='Open cart'>
                                <ShoppingCart />
                                {cartCount > 0 ? (
                                    <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] px-1 flex items-center justify-center'>
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                ) : null}
                            </Link>
                            <button
                                className='inline-flex items-center justify-center'
                                onClick={() => setOpen((v) => !v)}
                                aria-label='Toggle menu'
                            >
                                {open ? <X /> : <Menu />}
                            </button>
                        </div>
                    </div>
                    <div className='hidden md:flex flex-wrap justify-center gap-x-8 gap-y-3 py-6 border-t border-gray-300 px-6'>
                        {categories.map((category) => (
                            <Link key={category.id} to={category.to} className='focus:text-primary whitespace-nowrap'>
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
                                        <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] px-1 flex items-center justify-center'>
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
                                    {categories.map((category) => (
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
