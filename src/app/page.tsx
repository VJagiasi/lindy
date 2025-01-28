'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY as string;
const TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=20&offset=`;
const SEARCH_URL = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&limit=20&offset=`;

// Define GIF type
interface Gif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
    };
  };
}

export default function Home() {
  const [gifs, setGifs] = useState<Gif[]>([]); // List of GIFs
  const [searchQuery, setSearchQuery] = useState<string>(''); // Search input
  const [debouncedQuery, setDebouncedQuery] = useState<string>(''); // Debounced query
  const [offset, setOffset] = useState<number>(0); // Offset for pagination
  const [hasMore, setHasMore] = useState<boolean>(true); // Has more flag
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error message
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch GIFs function
  const fetchGifs = async (query: string, reset = false) => {
    if (isLoading || (!hasMore && !reset)) return;
    setIsLoading(true);
    setError(null);

    try {
      const url = query
        ? `${SEARCH_URL}${reset ? 0 : offset}&q=${query}`
        : `${TRENDING_URL}${reset ? 0 : offset}`;
      const response = await axios.get(url);
      const newGifs: Gif[] = response.data.data;

      if (reset) {
        setGifs(newGifs);
        setOffset(20);
      } else {
        setGifs((prev) => [...prev, ...newGifs]);
        setOffset((prevOffset) => prevOffset + 20);
      }

      if (newGifs.length === 0 && query) {
        setError(`No results found for "${query}".`);
      }

      setHasMore(newGifs.length > 0);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setError('Failed to fetch GIFs. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // Debounce delay (300ms)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Fetch GIFs based on the debounced query
  useEffect(() => {
    if (debouncedQuery) {
      fetchGifs(debouncedQuery, true);
    } else {
      fetchGifs('', true); // Default to trending when searchQuery is cleared
    }
  }, [debouncedQuery]);

  // Intersection Observer logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchGifs(debouncedQuery);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, isLoading, debouncedQuery]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search GIFs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded-lg text-black"
      />

      <h1 className="text-2xl font-bold mb-4">
        {debouncedQuery ? `Results for "${debouncedQuery}"` : 'Trending GIFs'}
      </h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-300">
        {gifs.map((gif, index) => (
          <div
            key={`${gif.id}-${index}`} // Composite key to ensure uniqueness
            className="border rounded-lg overflow-hidden animate-fade-in"
          >
            <img
              src={gif.images.fixed_height.url}
              alt={gif.title}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>

      <div ref={loaderRef} className="text-center mt-4">
        {isLoading && (
          <div className="flex justify-center items-center">
            <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full border-t-blue-500 border-gray-300"></div>
          </div>
        )}
        {!hasMore && !error && <p>No more GIFs to load.</p>}
      </div>
    </div>
  );
}