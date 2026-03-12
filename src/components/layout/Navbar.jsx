import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/Logo.png'
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react'
import { cartEvents, getCartCount } from '../../lib/cart'

const Navbar = () => {
    const [open, setOpen] = useState(false)
    const [cartCount, setCartCount] = useState(0)

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
                    <div className='hidden md:flex justify-center gap-8 py-6 border-t border-gray-300'>
                        <Link to='/sapatilhas' className='focus:text-red-500'>Sapatilhas</Link>
                        <Link to='/roupa' className='focus:text-red-500'>Roupa</Link>
                        <Link to='/relogios-gps' className='focus:text-red-500'>Relogios GPS</Link>
                        <Link to='/equipamento-corrida' className='focus:text-red-500'>Equipamento de Corrida</Link>
                        <Link to='/nutricao-desportiva' className='focus:text-red-500'>Nutricao Desportiva</Link>
                        <Link to='/hyrox' className='focus:text-red-500'>Hyrox</Link>
                        <Link to='/marcas' className='focus:text-red-500'>Marcas</Link>
                        <Link to='/saldos' className='focus:text-red-500'>Saldos</Link>
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
                                    <Link to='/sapatilhas' onClick={() => setOpen(false)}>Sapatilhas</Link>
                                    <Link to='/roupa' onClick={() => setOpen(false)}>Roupa</Link>
                                    <Link to='/relogios-gps' onClick={() => setOpen(false)}>Relogios GPS</Link>
                                    <Link to='/equipamento-corrida' onClick={() => setOpen(false)}>Equipamento de Corrida</Link>
                                    <Link to='/nutricao-desportiva' onClick={() => setOpen(false)}>Nutricao Desportiva</Link>
                                    <Link to='/hyrox' onClick={() => setOpen(false)}>Hyrox</Link>
                                    <Link to='/marcas' onClick={() => setOpen(false)}>Marcas</Link>
                                    <Link to='/saldos' onClick={() => setOpen(false)}>Saldos</Link>
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
