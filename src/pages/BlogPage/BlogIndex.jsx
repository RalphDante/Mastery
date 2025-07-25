// BlogIndex.jsx
import { Link } from 'react-router-dom';

function BlogIndex() {
  // Array of all your blog posts with metadata
  const blogPosts = [
    {
      slug: 'how-to-study-mcat-flashcards',
      title: 'How to Study for MCAT with Flashcards: Complete 2025 Guide - Mastery',
      excerpt: 'Discover how top scorers use AI-powered flashcard generation and spaced repetition to master 3,000+ concepts in half the time.',
      date: 'July 7, 2025',
      readTime: '12 min read'
    },
    // {
    //   slug: 'memory-techniques',
    //   title: '7 Memory Techniques That Actually Work',
    //   excerpt: 'Discover proven methods to improve your memory and retention for any subject...',
    //   date: 'January 10, 2025',
    //   readTime: '8 min read'
    // },
    // {
    //   slug: 'spaced-repetition-guide',
    //   title: 'The Complete Guide to Spaced Repetition',
    //   excerpt: 'Everything you need to know about this powerful learning technique...',
    //   date: 'January 5, 2025',
    //   readTime: '12 min read'
    // }
    // // ... more posts
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Study Tips & Techniques Blog</h1>
      
      <div className="space-y-8">
        {blogPosts.map((post) => (
          <article key={post.slug} className="border-b border-gray-200 pb-8">
            <Link to={`/blog/${post.slug}`} className="block hover:bg-gray-50 p-4 rounded-lg transition-colors">
              <h2 className="text-2xl font-semibold mb-2 text-blue-600 hover:text-blue-800">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-2">{post.excerpt}</p>
              <div className="text-sm text-gray-500">
                {post.date} • {post.readTime}
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default BlogIndex;