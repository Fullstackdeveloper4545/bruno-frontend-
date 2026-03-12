import React, { useEffect, useMemo, useState } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BlogCard from './components/ui/BlogCard'
import { getJson, resolveAssetUrl } from './lib/api'

const blogPosts = [
  {
    id: 1,
    title: 'Como escolher as sapatilhas ideais',
    date: '5 de Abril',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Como escolher as sapatilhas ideais',
    date: '6 de Abril',
    image:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Como escolher as sapatilhas ideais',
    date: '5 de Abril',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    title: 'Como escolher as sapatilhas ideais',
    date: '5 de Abril',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    title: 'Como escolher as sapatilhas ideais',
    date: '5 de Abril',
    image:
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 6,
    title: 'Como escolher as sapatilhas ideais',
    date: '5 de Abril',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
  },
]

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

function mapBlogPost(post, index) {
  const title = post?.title_pt || post?.title_es || `Artigo ${index + 1}`
  const slug = String(post?.slug || '').trim()
  return {
    id: post?.id || `blog-${index}`,
    title,
    date: formatDate(post?.published_at || post?.created_at),
    image: resolveAssetUrl(post?.cover_image_url || '') || blogPosts[index % blogPosts.length].image,
    to: slug ? `/blog/${encodeURIComponent(slug)}` : '/blogs',
  }
}

const BlogsPage = () => {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const rows = await getJson('/api/blog')
        if (!active) return
        setPosts(Array.isArray(rows) ? rows.map(mapBlogPost) : [])
      } catch (err) {
        if (!active) return
        setPosts([])
        setError(err instanceof Error ? err.message : 'Failed to load blogs.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const visiblePosts = useMemo(
    () => (posts.length > 0 ? posts : blogPosts.map((entry, index) => ({ ...entry, to: '/blogs', id: entry.id || index }))),
    [posts]
  )

  return (
    <>
      <Navbar />
      <section className='bg-[#efefef] py-12 min-h-[70vh]'>
        <div className='w-[90vw] max-w-[1150px] mx-auto'>
          <h1 className='m-0 text-[42px] font-normal text-black'>Blog</h1>
          <p className='mt-3 mb-8 max-w-[500px] text-[16px] leading-[1.45] text-black/80'>
            Ipsum sit id Morbi est non, dignissim, libero. Donec dolor sed vitae ex laoreet ex
            non, elit lorem, hendrerit amet, elit ex.
          </p>
          {loading ? <p className='mb-6 text-[13px] text-black/60'>Loading blogs...</p> : null}
          {error ? <p className='mb-6 text-[13px] text-[#b42318]'>Live blogs unavailable. Showing fallback items.</p> : null}

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10'>
            {visiblePosts.map((post) => (
              <BlogCard
                key={post.id}
                image={post.image}
                title={post.title}
                date={post.date}
                linkText='Ler mais'
                to={post.to}
              />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

export default BlogsPage
