import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/Logo.png'
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react'
import { cartEvents, getCartCount } from '../../lib/cart'
import { getJson, resolveAssetUrl } from '../../lib/api'
import { THEME_UPDATED_EVENT } from '../../lib/theme'
import SearchOverlay from './SearchOverlay'

function buildCategoryLink(category, index) {
    const categoryId = category?.id != null ? String(category.id) : `category-${index}`
    const categoryTitle = category?.name_pt || category?.name_es || category?.slug || `Categoria ${index + 1}`
    return {
        id: categoryId,
        parentId: category?.parent_id ? String(category.parent_id) : null,
        title: categoryTitle,
        image: resolveAssetUrl(category?.image_url || ''),
        to: `/products?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent(categoryTitle)}`,
    }
}

const Navbar = () => {
    const [open, setOpen] = useState(false)
    const [cartCount, setCartCount] = useState(0)
    const [categories, setCategories] = useState([])
    const [logoSrc, setLogoSrc] = useState(logo)
    const [searchOpen, setSearchOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [activeCategoryId, setActiveCategoryId] = useState(null)
    const profileRef = useRef(null)

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

    const openSearch = () => {
        setSearchOpen(true)
        setOpen(false)
        setProfileOpen(false)
    }

    const topCategories = categories.filter((category) => !category.parentId)
    const subcategoriesByParent = categories.reduce((acc, category) => {
        if (!category.parentId) return acc
        if (!acc[category.parentId]) acc[category.parentId] = []
        acc[category.parentId].push(category)
        return acc
    }, {})

    const activeCategory = topCategories.find((category) => category.id === activeCategoryId) || null
    const activeSubcategories = activeCategory ? (subcategoriesByParent[activeCategory.id] || []) : []
    const showcaseItems = activeSubcategories.filter((item) => item.image).slice(0, 2)

    useEffect(() => {
        if (!profileOpen) return

        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [profileOpen])

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
                            <button
                                type='button'
                                onClick={openSearch}
                                aria-label='Open search'
                                className='inline-flex items-center justify-center'
                            >
                                <Search />
                            </button>
                            <div className='relative' ref={profileRef}>
                                <button
                                    type='button'
                                    onClick={() => setProfileOpen((prev) => !prev)}
                                    aria-label='Open profile menu'
                                    className='inline-flex items-center justify-center'
                                >
                                    <User />
                                </button>
                                {profileOpen ? (
                                    <div className='absolute right-0 mt-3 w-44 rounded-xl border border-black/10 bg-white p-2 shadow-lg'>
                                        <Link
                                            to='/profile'
                                            onClick={() => setProfileOpen(false)}
                                            className='block rounded-lg px-3 py-2 text-[13px] hover:bg-black/[0.04]'
                                        >
                                            Perfil
                                        </Link>
                                        <Link
                                            to='/orders'
                                            onClick={() => setProfileOpen(false)}
                                            className='block rounded-lg px-3 py-2 text-[13px] hover:bg-black/[0.04]'
                                        >
                                            Encomendas
                                        </Link>
                                        <button
                                            type='button'
                                            onClick={() => setProfileOpen(false)}
                                            className='w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50'
                                        >
                                            Sair
                                        </button>
                                    </div>
                                ) : null}
                            </div>
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
                    <div
                        className='relative hidden md:block border-t border-gray-300'
                        onMouseLeave={() => setActiveCategoryId(null)}
                    >
                        <div className='mx-auto flex max-w-[1380px] flex-wrap justify-center gap-x-8 gap-y-3 px-6 py-6'>
                            {topCategories.map((category) => (
                                <Link
                                    key={category.id}
                                    to={category.to}
                                    onMouseEnter={() => setActiveCategoryId(category.id)}
                                    className='focus:text-primary whitespace-nowrap'
                                >
                                    {category.title}
                                </Link>
                            ))}
                        </div>
                        {activeCategory ? (
                            <div className='absolute left-0 right-0 top-full z-40 border-t border-black/10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]'>
                                <div className='mx-auto grid max-w-[1380px] gap-10 px-6 py-10 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]'>
                                    <div>
                                        <p className='text-[11px] uppercase tracking-[0.24em] text-black/40'>Todas as {activeCategory.title}</p>
                                        <Link to={activeCategory.to} className='mt-4 inline-flex text-[14px] font-medium'>Mostrar tudo</Link>
                                    </div>
                                    <div>
                                        <p className='text-[11px] uppercase tracking-[0.24em] text-black/40'>Tipo de {activeCategory.title}</p>
                                        <div className='mt-4 flex flex-col gap-3 text-[14px]'>
                                            {activeSubcategories.length === 0 ? (
                                                <span className='text-black/50'>Sem subcategorias</span>
                                            ) : (
                                                activeSubcategories.map((subcategory) => (
                                                    <Link key={subcategory.id} to={subcategory.to} className='text-black/80 hover:text-black'>
                                                        {subcategory.title}
                                                    </Link>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        {showcaseItems.length > 0 ? (
                                            showcaseItems.map((item) => (
                                                <Link
                                                    key={item.id}
                                                    to={item.to}
                                                    className='group relative overflow-hidden rounded-2xl'
                                                >
                                                    <img src={item.image} alt={item.title} className='h-48 w-full object-cover transition duration-300 group-hover:scale-105' />
                                                    <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent' />
                                                    <div className='absolute bottom-4 left-4 flex items-center gap-2 text-white'>
                                                        <span className='text-[16px]'>{item.title}</span>
                                                        <span className='text-[18px]'>&rarr;</span>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className='flex h-48 items-center justify-center rounded-2xl border border-dashed border-black/10 text-[12px] text-black/40'>
                                                Sem imagens
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {open && (
                        <div className='md:hidden border-t border-gray-300 px-4 py-4 space-y-4'>
                            <div className='flex gap-6'>
                                <button
                                    type='button'
                                    onClick={openSearch}
                                    aria-label='Open search'
                                    className='inline-flex items-center justify-center'
                                >
                                    <Search />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setProfileOpen((prev) => !prev)}
                                    aria-label='Open profile menu'
                                    className='inline-flex items-center justify-center'
                                >
                                    <User />
                                </button>
                                <Link to='/cart' className='relative' aria-label='Open cart' onClick={() => setOpen(false)}>
                                    <ShoppingCart />
                                    {cartCount > 0 ? (
                                        <span className='absolute -top-2 -right-2 min-w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] px-1 flex items-center justify-center'>
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </span>
                                    ) : null}
                                </Link>
                            </div>
                            {profileOpen ? (
                                <div className='rounded-xl border border-black/10 bg-white p-2'>
                                    <Link
                                        to='/profile'
                                        onClick={() => {
                                            setProfileOpen(false)
                                            setOpen(false)
                                        }}
                                        className='block rounded-lg px-3 py-2 text-[13px] hover:bg-black/[0.04]'
                                    >
                                        Perfil
                                    </Link>
                                    <Link
                                        to='/orders'
                                        onClick={() => {
                                            setProfileOpen(false)
                                            setOpen(false)
                                        }}
                                        className='block rounded-lg px-3 py-2 text-[13px] hover:bg-black/[0.04]'
                                    >
                                        Encomendas
                                    </Link>
                                    <button
                                        type='button'
                                        onClick={() => setProfileOpen(false)}
                                        className='w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50'
                                    >
                                        Sair
                                    </button>
                                </div>
                            ) : null}
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
                                    {topCategories.map((category) => (
                                        <div key={category.id} className='space-y-2'>
                                            <Link to={category.to} onClick={() => setOpen(false)} className='font-medium'>
                                                {category.title}
                                            </Link>
                                            {(subcategoriesByParent[category.id] || []).map((subcategory) => (
                                                <Link
                                                    key={subcategory.id}
                                                    to={subcategory.to}
                                                    onClick={() => setOpen(false)}
                                                    className='block pl-3 text-[13px] text-black/70'
                                                >
                                                    {subcategory.title}
                                                </Link>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                </nav>
            </header>
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    )
}

export default Navbar
