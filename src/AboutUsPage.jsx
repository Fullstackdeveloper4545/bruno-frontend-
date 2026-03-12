import React, { useEffect, useMemo, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Pagination, Navigation } from 'swiper/modules'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import StoreCard from './components/ui/StoreCard'
import AnaDiasOne from './assets/ana-dias-1.jpg'
import AnaDiasTwo from './assets/ana-dias-2.jpg'
import StoreFaro from './assets/Faro.png'
import StoreLisboa from './assets/Lisboa.png'
import StoreMatosinhos from './assets/Matosinhos.png'
import { getJson, resolveAssetUrl } from './lib/api'

const fallbackAbout = {
  hero_title: 'Sobre Nos',
  hero_body:
    'Para muitos corredores, evoluir parece significar treinar mais e mais. A nossa abordagem combina equipamento certo, recuperacao e acompanhamento para melhorares de forma consistente e sustentavel.',
  section_title: 'A nossa missao',
  section_body:
    'Ajudar cada atleta, do iniciante ao competitivo, a correr com confianca. Selecionamos produtos tecnicos, partilhamos conhecimento pratico e criamos uma comunidade focada em progresso real.',
  section_images: {
    hero: AnaDiasTwo,
    left: AnaDiasOne,
    right_top: AnaDiasTwo,
    right_bottom: AnaDiasTwo,
  },
  testimonials: [
    {
      quote:
        'Atendimento excelente e recomendacoes mesmo acertadas para o meu tipo de corrida.',
      author: 'Mariana S.',
      role: 'Runner',
    },
    {
      quote:
        'Comprei para trail e senti diferenca logo nos primeiros treinos.',
      author: 'Rui P.',
      role: 'Trail Runner',
    },
    {
      quote:
        'Equipe tecnica e muito disponivel. Experiencia de compra muito boa.',
      author: 'Ines R.',
      role: 'Amateur Athlete',
    },
  ],
}

const fallbackStores = [
  { id: 'faro', name: 'Loja de Faro', image: StoreFaro },
  { id: 'lisboa', name: 'Loja de Lisboa', image: StoreLisboa },
  { id: 'matosinhos', name: 'Loja de Matosinhos', image: StoreMatosinhos },
]

function normalizeImage(value, fallbackValue) {
  const resolved = resolveAssetUrl(value || '')
  return resolved || fallbackValue
}

const AboutUsPage = () => {
  const [aboutData, setAboutData] = useState(fallbackAbout)
  const [stores, setStores] = useState(fallbackStores)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const [aboutResult, storesResult] = await Promise.allSettled([
          getJson('/api/system/about-us', { signal: controller.signal }),
          getJson('/api/stores', { signal: controller.signal }),
        ])
        if (!active) return

        if (aboutResult.status === 'fulfilled' && aboutResult.value && typeof aboutResult.value === 'object') {
          const incoming = aboutResult.value
          setAboutData({
            hero_title: incoming.hero_title || fallbackAbout.hero_title,
            hero_body: incoming.hero_body || fallbackAbout.hero_body,
            section_title: incoming.section_title || fallbackAbout.section_title,
            section_body: incoming.section_body || fallbackAbout.section_body,
            section_images: {
              hero: normalizeImage(incoming.section_images?.hero, fallbackAbout.section_images.hero),
              left: normalizeImage(incoming.section_images?.left, fallbackAbout.section_images.left),
              right_top: normalizeImage(incoming.section_images?.right_top, fallbackAbout.section_images.right_top),
              right_bottom: normalizeImage(
                incoming.section_images?.right_bottom,
                fallbackAbout.section_images.right_bottom
              ),
            },
            testimonials:
              Array.isArray(incoming.testimonials) && incoming.testimonials.length > 0
                ? incoming.testimonials
                : fallbackAbout.testimonials,
          })
        }

        if (storesResult.status === 'fulfilled' && Array.isArray(storesResult.value)) {
          const mappedStores = storesResult.value
            .filter((store) => store?.is_active !== false)
            .slice(0, 3)
            .map((store, index) => ({
              id: store?.id || `store-${index}`,
              name: store?.name || 'Loja',
              image: resolveAssetUrl(store?.image_url || '') || fallbackStores[index % fallbackStores.length].image,
            }))
          if (mappedStores.length > 0) {
            setStores(mappedStores)
          }
        }

        if (aboutResult.status === 'rejected' && storesResult.status === 'rejected') {
          setError('Conteudo dinamico indisponivel. A mostrar conteudo padrao.')
        }
      } catch (err) {
        if (!active || err?.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Falha ao carregar conteudo.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const testimonials = useMemo(
    () => (Array.isArray(aboutData.testimonials) ? aboutData.testimonials : fallbackAbout.testimonials),
    [aboutData]
  )

  const cardClass =
    'bg-black text-white rounded-[18px] p-8 w-[300px] sm:w-[280px] flex flex-col justify-between'

  return (
    <>
      <Navbar />

      {loading ? <p className='mt-4 text-center text-[13px] text-[#6b7280]'>A carregar conteudo...</p> : null}
      {error ? <p className='mt-4 text-center text-[13px] text-[#b42318]'>{error}</p> : null}

      <section className='bg-white px-5 py-12 sm:py-16 '>
        <div className='mx-auto max-w-[1200px] grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start'>
          <div className='w-full'>
            <img
              src={aboutData.section_images?.hero || fallbackAbout.section_images.hero}
              alt='Sobre Nos'
              className='w-full h-[50%] object-cover'
            />
          </div>

          <div className='pt-2'>
            <h1 className='m-0 lg:text-[58px] sm:text-[34px] md:text-[38px] text-[#3a231d] font-medium'>
              {aboutData.hero_title || fallbackAbout.hero_title}
            </h1>
            <p className='mt-4 text-[14px] sm:text-[15px] leading-[1.75] text-[#2c2c2c]'>
              {aboutData.hero_body || fallbackAbout.hero_body}
            </p>
          </div>
        </div>
      </section>

      <section className='bg-white px-5 pb-12 sm:pb-16 '>
        <div className='mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-start'>
          <div>
            <h2 className='m-0 text-[30px] sm:text-[34px] lg:text-[38px] text-[#3a231d] font-medium'>
              {aboutData.section_title || fallbackAbout.section_title}
            </h2>
            <p className='mt-4 max-w-[520px] text-[14px] sm:text-[15px] leading-[1.75] text-[#2c2c2c]'>
              {aboutData.section_body || fallbackAbout.section_body}
            </p>

            <div className='mt-8 w-full max-w-[520px] overflow-hidden bg-[#f2f2f2]'>
              <img
                src={aboutData.section_images?.left || fallbackAbout.section_images.left}
                alt='Sobre Nos'
                className='w-full h-full object-cover'
              />
            </div>
          </div>

          <div className='grid gap-6'>
            <div className='w-full overflow-hidden bg-[#f2f2f2]'>
              <img
                src={aboutData.section_images?.right_top || fallbackAbout.section_images.right_top}
                alt='Corredor'
                className='w-full h-full object-cover'
              />
            </div>
            <div className='w-full overflow-hidden bg-[#f2f2f2]'>
              <img
                src={aboutData.section_images?.right_bottom || fallbackAbout.section_images.right_bottom}
                alt='Treino'
                className='w-full h-full object-cover'
              />
            </div>
          </div>
        </div>
      </section>

      <section className='bg-white px-5 py-12 sm:py-16 '>
        <div className='mx-auto max-w-[1200px] flex flex-col lg:flex-row gap-10 lg:gap-14 items-start'>
          <div className=' lg:hidden lg:w-[280px] text-center'>
            <p className='m-0 text-[12px] tracking-[2px] text-[#8b8b8b] uppercase'>Testemunhos</p>
            <h2 className='m-0 mt-4 text-[28px] sm:text-[32px] lg:text-[36px] leading-[1.15] text-[#1f1f1f] font-medium'>
              O que os
              nossos
              clientes dizem
            </h2>
          </div>

          <div className='flex-1'>
            <div className='md:hidden lg:w-[280px]'>
              <Swiper
                slidesPerView={1}
                spaceBetween={12}
                loop={true}
                pagination={{ clickable: true }}
                navigation={true}
                modules={[Pagination, Navigation]}
                className='mySwiper'
              >
                {testimonials.map((item, index) => (
                  <SwiperSlide key={`${item.author || 'autor'}-${index}`} className='mx-[20px]'>
                    <article className={cardClass}>
                      <p className='m-0 text-[18px] leading-[1.7] text-[#f1f1f1]'>{item.quote}</p>
                      <p className='m-0 mt-6 text-[18px] text-[#c9c9c9]'>
                        - {item.author} / {item.role}
                      </p>
                    </article>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <div className='hidden md:flex flex-wrap gap-5 justify-start'>
              <div className='lg:w-[280px]'>
                <p className='m-0 text-[12px] tracking-[2px] text-[#8b8b8b] uppercase'>Testemunhos</p>
                <h2 className='m-0 mt-4 text-[28px] sm:text-[32px] lg:text-[36px] leading-[1.15] text-[#1f1f1f] font-medium'>
                  O que os
                  <br />
                  nossos
                  <br />
                  clientes dizem
                </h2>
              </div>
              {testimonials.map((item, index) => (
                <article key={`${item.author || 'autor'}-${index}`} className={cardClass}>
                  <p className='m-0 text-[18px] leading-[1.7] text-[#f1f1f1]'>{item.quote}</p>
                  <p className='m-0 mt-6 text-[18px] text-[#c9c9c9]'>
                    - {item.author} / {item.role}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-[1366px] px-5 sm:px-8 lg:px-[42px] py-[40px] sm:py-[55px] lg:py-[70px] text-center '>
        <h2 className='m-0 text-[28px] sm:text-[32px] leading-[1.04] font-normal text-[#262626]'>
          Estamos perto de ti
        </h2>
        <p className='m-0 mt-3 text-[14px] sm:text-[16px] leading-[1.5] tracking-[0.04em] text-[#333]'>
          Visita-nos numa das nossas lojas fisicas e recebe aconselhamento especializado.
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
            {stores.map((store) => (
              <SwiperSlide key={`store-mobile-${store.id}`} className='py-2'>
                <StoreCard image={store.image} title={store.name} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className='mt-6 hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {stores.map((store) => (
            <StoreCard key={`store-desktop-${store.id}`} image={store.image} title={store.name} />
          ))}
        </div>
      </section>

      <Footer />
    </>
  )
}

export default AboutUsPage
