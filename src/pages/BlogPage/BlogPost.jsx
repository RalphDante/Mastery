// BlogPost.jsx
import { useParams } from 'react-router-dom';
import BlogPost1 from './BlogPosts/BlogPost1';
// ... import all your blog posts

const blogPosts = {
  'how-to-study-mcat-flashcards': BlogPost1,
};

function BlogPost() {
  const { slug } = useParams();
  const PostComponent = blogPosts[slug];
  
  if (!PostComponent) {
    return <div>Blog post not found</div>;
  }
  
  return <PostComponent />;
}

export default BlogPost;