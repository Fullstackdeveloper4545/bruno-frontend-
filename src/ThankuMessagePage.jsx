import React from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

const ThankuMessagePage = () => {
  return (
    <>
      <Navbar />

      <div className='min-h-[calc(100vh-160px)] flex flex-col'>
        <section className='flex-1 bg-white px-5 py-28 font-["Poppins",sans-serif]'>
          <div className='w-[80%] mx-auto max-w-[1180px] text-center'>
            <h1 className='m-0 lg:text-[52px] sm:text-[26px] tracking-[0.6px] text-[#111] uppercase'>
              Obrigado pela sua mensagem!
            </h1>
            <p className='mt-3 text-[16px] text-[#6b7280]'>
              Agradecemos o envio da sua mensagem, a nossa equipa entrará em contacto em breve.

            </p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  )
}

export default ThankuMessagePage
