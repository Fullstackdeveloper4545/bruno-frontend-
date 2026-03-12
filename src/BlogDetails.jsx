import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { getJson, resolveAssetUrl } from './lib/api'

const fallbackBlog = {
  id: 'sample-1',
  title: 'Titulo do artigo',
  date: 'Data do artigo',
  heroImage:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  paragraphs: ['Conteudo indisponivel no momento.'],
}

function formatDate(value) {
  if (!value) return 'Sem data'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sem data'
  return parsed.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function normalizeParagraphs(content) {
  const text = String(content || '').trim()
  if (!text) return fallbackBlog.paragraphs
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const BlogDetails = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      const safeSlug = String(slug || '').trim()
      if (!safeSlug) {
        setPost(null)
        setLoading(false)
        setError('Invalid blog URL.')
        return
      }

      try {
        setLoading(true)
        setError('')
        const row = await getJson(`/api/blog/${encodeURIComponent(safeSlug)}`)
        if (!active) return
        setPost(row)
      } catch (err) {
        if (!active) return
        setPost(null)
        setError(err instanceof Error ? err.message : 'Failed to load blog post.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [slug])

  const blog = useMemo(() => {
    if (!post) return fallbackBlog
    const title = post?.title_pt || post?.title_es || fallbackBlog.title
    return {
      id: post?.id || fallbackBlog.id,
      title,
      date: formatDate(post?.published_at || post?.created_at),
      heroImage: resolveAssetUrl(post?.cover_image_url || '') || fallbackBlog.heroImage,
      paragraphs: normalizeParagraphs(post?.content_pt || post?.content_es),
    }
  }, [post])

  return (
    <>
      <Navbar />

      <section className='bg-white px-5 py-10 font-["Poppins",sans-serif]'>
        <div className='w-[80%] mx-auto max-w-none'>
          {loading ? <p className='mb-6 text-[13px] text-[#6b7280]'>Loading blog...</p> : null}
          {error ? <p className='mb-6 text-[13px] text-[#b42318]'>{error}</p> : null}

          <div className='w-full overflow-hidden bg-[#f2f3f6]'>
            <img
              src={blog.heroImage}
              alt={blog.title}
              className='w-full h-[220px] sm:h-[260px] md:h-[300px] object-cover'
            />
          </div>

          <div className='mt-8 max-w-none'>
            <h1 className='m-0 lg:text-[52px] sm:text-[30px] text-[#111] tracking-[0.4px]'>
              {blog.title}
            </h1>
            <p className='mt-2 text-[16px] text-[#8b93a7]'>{blog.date}</p>

            <div className='mt-6 grid gap-4 text-[16px] leading-[1.7] text-[#3c3c3c]'>
              {blog.paragraphs.map((paragraph, index) => (
                <p key={`${blog.id}-p-${index}`} className='m-0'>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default BlogDetails
