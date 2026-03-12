import React from 'react'

function Footer() {
  return (
    <footer className='bg-black text-white mt-[10vh]'>
      <div className='w-[90vw] mx-auto py-12'>
        <div className='flex flex-wrap gap-y-10'>
          <div className='w-full md:w-1/4'>
            <h4 className='text-[16px] mb-4'>Menu</h4>
            <ul className='text-[14px] space-y-2'>
              <li>Loja</li>
              <li>Sobre Nós</li>
              <li>Contactos</li>
              <li>Blog</li>
            </ul>
          </div>
          <div className='w-full md:w-1/4'>
            <h4 className='text-[16px] mb-4'>Precisa de ajuda?</h4>
            <ul className='text-[14px] space-y-2'>
              <li>Apoio ao Cliente</li>
              <li>Trocas e Devoluções</li>
            </ul>
          </div>
          <div className='w-full md:w-1/4'>
            <h4 className='text-[16px] mb-4'>Contactos</h4>
            <ul className='text-[14px] space-y-2'>
              <li>R. Baptista Lopes 16,</li>
              <li>8000-225 Faro</li>
              <li>Rua Ilha dos Amores 30 C</li>
              <li>1990-118 Lisboa</li>
              <li>Rua D. João I 767 4450-166</li>
              <li>Matosinhos</li>
              <li>(+351) 916 171 577*</li>
              <li>geral@anadias.run</li>
            </ul>
          </div>
          <div className='w-full md:w-1/4'>
            <div className='flex'>
              <input
                type='email'
                placeholder='Email'
                className='w-full bg-white text-black text-[14px] px-4 py-4 outline-none'
              />
              <button className='bg-[#7A97A1] px-5 text-white'>→</button>
            </div>
          </div>
        </div>

        <div className='border-t border-white/10 mt-10 pt-6 flex flex-wrap items-center justify-between text-[11px]'>
          <span>© 2026 All Rights Reserved</span>
          <div className='flex gap-6'>
            <span>Política de Privacidade</span>
            <span>Termos e Condições</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
