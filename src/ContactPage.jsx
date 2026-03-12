import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Pagination, Navigation } from 'swiper/modules'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import StoreCard from './components/ui/StoreCard'
import StoreFaro from './assets/Faro.png'
import StoreLisboa from './assets/Lisboa.png'
import StoreMatosinhos from './assets/Matosinhos.png'

const ContactPage = () => {
  return (
    <>
      <Navbar />

      <main className='bg-white text-black font-[Helvetica,Arial,sans-serif]'>
        <section className='mx-auto max-w-[1366px] grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-10 lg:gap-[120px] px-5 sm:px-8 lg:px-20 pt-[60px] sm:pt-[72px] lg:pt-[90px] pb-[52px] sm:pb-[70px] lg:pb-[100px]'>
          <div>
            <h1 className='m-0 mb-[18px] sm:mb-[30px] text-[48px] sm:text-[62px] lg:text-[82px] leading-[0.82] font-normal'>
              CONTACTOS
            </h1>
            <p className='m-0 max-w-[565px] text-[16px] sm:text-[18px] leading-[1.22]'>
              Nisi duis culpa proident magna in nisi et ex aute culpa et aliqua. Dolor sunt ex qui
              eu sunt pariatur adipisicing pariatur minim. Nisi duis culpa proident magna in nisi
              et ex aute culpa et aliqua.
            </p>
            <div className='mt-[42px] lg:mt-[150px] flex flex-wrap gap-5 sm:gap-[46px] text-[16px] sm:text-[18px]'>
              <span>TIKTOK</span>
              <span>INSTAGRAM</span>
              <span>FACEBOOK</span>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-y-[18px] sm:gap-y-[36px] lg:gap-y-[95px] gap-x-[36px] pt-0 lg:pt-[120px] text-[16px] sm:text-[18px]'>
            <p className='m-0'>email</p>
            <p className='m-0'>numero</p>
            <p className='m-0'>morada</p>
          </div>
        </section>

        <section className='w-full grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-9 lg:gap-[80px] px-5 sm:px-8 lg:px-20 py-[46px] sm:py-[60px] lg:py-[70px] bg-[#6c939b] text-white'>
          <div>
            <h2 className='m-0 text-[36px] sm:text-[44px] lg:text-[54px] leading-[1.2] sm:leading-[1.41] tracking-[0.05em] font-normal'>
              TEM DUVIDAS
              <br />A ESCLARECER?
            </h2>
            <p className='mt-[22px] mb-0 max-w-[382px] text-[16px] leading-[1.38] font-light'>
              Tem alguma questao ou pretende mais informacoes sobre os nossos servicos? Estamos
              disponiveis para o ajudar e esclarecer todas as suas duvidas.
            </p>
          </div>

          <form className='flex flex-col gap-6 sm:gap-[30px]'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-[30px]'>
              <label className='flex flex-col gap-2.5 text-[16px] sm:text-[18px] font-light'>
                Nome
                <input
                  type='text'
                  className='bg-transparent border-0 border-b border-white text-white py-1.5 text-[16px] outline-none'
                />
              </label>
              <label className='flex flex-col gap-2.5 text-[16px] sm:text-[18px] font-light'>
                Telemovel
                <input
                  type='text'
                  className='bg-transparent border-0 border-b border-white text-white py-1.5 text-[16px] outline-none'
                />
              </label>
            </div>

            <label className='flex flex-col gap-2.5 text-[16px] sm:text-[18px] font-light'>
              Email
              <input
                type='email'
                className='bg-transparent border-0 border-b border-white text-white py-1.5 text-[16px] outline-none'
              />
            </label>

            <label className='flex flex-col gap-2.5 text-[16px] sm:text-[18px] font-light'>
              Mensagem
              <textarea
                rows='3'
                className='bg-transparent border-0 border-b border-white text-white py-1.5 text-[16px] outline-none resize-none'
              />
            </label>

            <button type='button' className='self-end border-0 bg-transparent text-white text-[16px]'>
              Enviar
            </button>
          </form>
        </section>

        <section className='mx-auto max-w-[1366px] px-5 sm:px-8 lg:px-[42px] py-[40px] sm:py-[55px] lg:py-[70px] text-center border-t border-[#d9d9d9]'>
  <h2 className='m-0 text-[28px] sm:text-[32px] leading-[1.04] font-normal text-[#262626]'>
    Estamos perto de ti
  </h2>
  <p className='m-0 mt-3 text-[14px] sm:text-[16px] leading-[1.5] tracking-[0.04em] text-[#333]'>
Visita-nos numa das nossas lojas físicas e recebe aconselhamento especializado.
  </p>
  <div className='mt-6 md:hidden'>
    <Swiper
      slidesPerView={1}
      spaceBetween={12}
      pagination={{ clickable: true }}
      navigation={true}
      modules={[Pagination, Navigation]}
      className='mySwiper'
    >
      <SwiperSlide className='py-2'>
        <StoreCard image={StoreFaro} title='Loja de Faro' />
      </SwiperSlide>
      <SwiperSlide  className='py-2'>
        <StoreCard image={StoreLisboa} title='Loja de Lisboa' />
      </SwiperSlide>
      <SwiperSlide  className='py-2'>
        <StoreCard image={StoreMatosinhos} title='Loja de Matosinhos' />
      </SwiperSlide>
    </Swiper>
  </div>
  <div className='mt-6 hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
    <StoreCard image={StoreFaro} title='Loja de Faro' />
    <StoreCard image={StoreLisboa} title='Loja de Lisboa' />
    <StoreCard image={StoreMatosinhos} title='Loja de Matosinhos' />
  </div>
</section>
      </main>

      <Footer />
    </>
  )
}

export default ContactPage
