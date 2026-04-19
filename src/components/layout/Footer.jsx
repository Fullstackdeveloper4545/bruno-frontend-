import React from 'react'

function Footer() {
  return (
    <footer className='mt-[10vh] bg-primary text-primary-foreground'>
      <div className='mx-auto w-[90vw] max-w-[1366px] py-12 sm:py-14'>
        <div className='grid gap-10 md:grid-cols-2 xl:grid-cols-4'>
          <div>
            <h4 className='mb-4 text-[16px]'>Menu</h4>
            <ul className='space-y-2 text-[14px]'>
              <li>Loja</li>
              <li>Sobre Nos</li>
              <li>Contactos</li>
              <li>Blog</li>
            </ul>
          </div>

          <div>
            <h4 className='mb-4 text-[16px]'>Precisa de ajuda?</h4>
            <ul className='space-y-2 text-[14px]'>
              <li>Apoio ao Cliente</li>
              <li>Trocas e Devolucoes</li>
            </ul>
          </div>

          <div>
            <h4 className='mb-4 text-[16px]'>Contactos</h4>
            <ul className='space-y-2 text-[14px]'>
              <li>R. Baptista Lopes 16,</li>
              <li>8000-225 Faro</li>
              <li>Rua Ilha dos Amores 30 C</li>
              <li>1990-118 Lisboa</li>
              <li>Rua D. Joao I 767 4450-166</li>
              <li>Matosinhos</li>
              <li>(+351) 916 171 577*</li>
              <li>geral@anadias.run</li>
            </ul>
          </div>

          <div>
            <div className='flex overflow-hidden rounded-md bg-white'>
              <input
                type='email'
                placeholder='Email'
                className='w-full min-w-0 bg-white px-4 py-4 text-[14px] text-black outline-none'
              />
              <button className='shrink-0 bg-primary-foreground px-5 text-primary' aria-label='Subscribe'>
                →
              </button>
            </div>
          </div>
        </div>

        <div className='mt-10 flex flex-col gap-4 border-t border-primary-foreground/20 pt-6 text-[11px] sm:flex-row sm:items-center sm:justify-between'>
          <span>© 2026 All Rights Reserved</span>
          <div className='flex flex-wrap gap-4 sm:gap-6'>
            <span>Politica de Privacidade</span>
            <span>Termos e Condicoes</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
