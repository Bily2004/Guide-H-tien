/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Search, MapPin, Shield, Utensils, Info, Loader2, Compass, 
  ArrowRight, ExternalLink, Languages, AlertTriangle, Phone, PhoneCall, Copy,
  MessageSquare, BookOpen, Heart, Navigation, Newspaper, Banknote, RefreshCcw, ArrowLeftRight,
  Palmtree, Music, Quote, Landmark, UtensilsCrossed, X, Star, History, Camera, Send, Share2, Check,
  Moon, Sun, Film, Upload, Download, AlertCircle, Volume2, Sparkles, ChevronDown, Book, Video, Globe, Map,
  ThumbsUp, MessageCircle, User, Image, PlusCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InteractiveMap from './components/InteractiveMap';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
  };
  web?: {
    uri: string;
    title: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  groundingLinks?: { uri: string; title: string }[];
}

type Tab = 'guide' | 'language' | 'crisis' | 'news' | 'currency' | 'explore' | 'culture' | 'proverbs' | 'feedback' | 'video' | 'learn' | 'community';

interface ExperiencePost {
  id: string;
  user: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: number;
  comments: { user: string; text: string }[];
  timestamp: Date;
}

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  source: string;
}

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('guide');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [translationInput, setTranslationInput] = useState('');
  const [translationResult, setTranslationResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState<string>('1');
  const [htgAmount, setHtgAmount] = useState<string>('');
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [uiTranslations, setUiTranslations] = useState<Record<string, string>>({});
  const [isUiTranslating, setIsUiTranslating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationDetails, setLocationDetails] = useState<string | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [locationLinks, setLocationLinks] = useState<{ uri: string; title: string }[]>([]);
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [selectedCultureItem, setSelectedCultureItem] = useState<{ title: string; icon: any; desc: string } | null>(null);
  const [cultureDetails, setCultureDetails] = useState<string | null>(null);
  const [isCultureLoading, setIsCultureLoading] = useState(false);
  const [cultureLinks, setCultureLinks] = useState<{ uri: string; title: string }[]>([]);
  const [activeIframeUrl, setActiveIframeUrl] = useState<string | null>(null);

  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState('Suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [proverbsList, setProverbsList] = useState([
    { kr: 'Piti piti, zwazo fè nich li.', en: 'Little by little, the bird builds its nest.', meaning: 'Patience and persistence lead to success.' },
    { kr: 'Men anpil, chay pa lou.', en: 'Many hands make the load light.', meaning: 'Cooperation makes difficult tasks easier.' },
    { kr: 'Dèyè mòn, gen mòn.', en: 'Beyond mountains, there are mountains.', meaning: 'As you solve one problem, another one appears. Life is a series of challenges.' },
    { kr: 'Sak vid pa kanpe.', en: 'An empty sack cannot stand up.', meaning: 'You cannot work or function well without food or resources.' },
    { kr: 'Kreyòl pale, kreyòl konprann.', en: 'Creole spoken, Creole understood.', meaning: 'Let\'s be honest and direct with each other.' },
    { kr: 'Wòch nan dlo pa konnen doulè wòch nan solèy.', en: 'The rock in the water doesn\'t know the pain of the rock in the sun.', meaning: 'Those in comfortable positions cannot understand the suffering of those in difficult ones.' },
    { kr: 'Bondye bon.', en: 'God is good.', meaning: 'A common expression of faith and hope in the face of adversity.' },
  ]);
  const [isProverbsLoading, setIsProverbsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [ttsIntonation, setTtsIntonation] = useState('clearly');
  const [activeEmergency, setActiveEmergency] = useState<{ name: string, number: string } | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  
  // Learn Creole Dynamic State
  const [lessonTopic, setLessonTopic] = useState('');
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceLinks, setResourceLinks] = useState<{ uri: string; title: string }[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  
  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoImages, setVideoImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Community State
  const [posts, setPosts] = useState<ExperiencePost[]>([
    {
      id: '1',
      user: 'Jean-Pierre',
      content: 'Just visited the Citadelle Laferrière. Absolutely breathtaking! The history here is so powerful. 🇭🇹',
      mediaUrl: 'https://images.unsplash.com/photo-1549421263-504527736209?q=80&w=800&auto=format&fit=crop',
      mediaType: 'image',
      likes: 24,
      comments: [{ user: 'Marie', text: 'I was there last year, it truly is a wonder!' }],
      timestamp: new Date(Date.now() - 3600000 * 2)
    },
    {
      id: '2',
      user: 'Fabienne',
      content: 'Beautiful sunset at Côte des Arcadins. Haiti is truly the pearl of the Antilles.',
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
      mediaType: 'image',
      likes: 45,
      comments: [],
      timestamp: new Date(Date.now() - 3600000 * 5)
    }
  ]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<string | null>(null);
  const [newPostMediaType, setNewPostMediaType] = useState<'image' | 'video'>('image');
  const [isPosting, setIsPosting] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setVideoImages(prev => [...prev, base64].slice(0, 3)); // Limit to 3 images
      };
      reader.readAsDataURL(file);
    });
  };

  const generateVideo = async () => {
    if (!videoPrompt && videoImages.length === 0) return;
    
    setIsVideoGenerating(true);
    setVideoStatus(t('Preparing generation...'));
    setVideoUrl(null);

    try {
      // Create a new instance to ensure the latest API key is used
      const genAI = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY || '' });
      
      let operation;
      
      if (videoImages.length > 0) {
        setVideoStatus(t('Uploading reference images...'));
        const referenceImages = videoImages.map(img => ({
          image: {
            imageBytes: img.split(',')[1],
            mimeType: img.split(';')[0].split(':')[1],
          },
          referenceType: "ASSET" as any, // VideoGenerationReferenceType.ASSET
        }));

        operation = await genAI.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: videoPrompt || t('A cinematic video based on these images.'),
          config: {
            numberOfVideos: 1,
            referenceImages,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      } else {
        setVideoStatus(t('Starting video generation...'));
        operation = await genAI.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: videoPrompt,
          config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio: '16:9'
          }
        });
      }

      // Poll for completion
      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        setVideoStatus(`${t('Generating video...')} (${pollCount * 10}s)`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await genAI.operations.getVideosOperation({ operation });
      }

      setVideoStatus(t('Video ready! Fetching download link...'));
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        // Fetch the video with the API key header
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env as any).API_KEY || process.env.GEMINI_API_KEY || '',
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        } else {
          throw new Error('Failed to fetch video content');
        }
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      if (error.message?.includes('Requested entity was not found')) {
        setHasApiKey(false);
      }
      setVideoStatus(`${t('Error:')} ${error.message || t('Unknown error occurred')}`);
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const languages = [
    'English', 'Haitian Creole', 'French', 'Spanish', 'Portuguese', 
    'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 
    'Arabic', 'Russian', 'Hindi', 'Bengali', 'Turkish', 
    'Vietnamese', 'Polish', 'Dutch', 'Thai', 'Greek', 'Hebrew'
  ];

  const translateUI = async (lang: string) => {
    if (lang === 'English') {
      setUiTranslations({});
      return;
    }
    setIsUiTranslating(true);
    try {
      const uiStrings = [
        'Guide', 'Language', 'Crisis Center', 'News', 'Currency', 'Explore Map', 'Culture Map', 'Proverbs Map',
        'Ayiti Guide', 'Instant Translator', 'Safety & Emergency Alerts', 'Latest Headlines', 'Currency Converter',
        'Beaches, Restaurants & Sites', 'Haitian Culture Map', 'Haitian Proverbs Map', 'Safety Info', 'Top Places',
        'Local Food', 'Culture', 'Greetings', 'Directions', 'Emergencies', 'Emergency Contacts', 'Safety Guidelines',
        'Financial Tip', 'Major Cities Guide', 'Discover More Proverbs', 'Learn More', 'Subscribe Now', 'Subscribed',
        'Translate', 'Result', 'Type in English or Creole...', 'Search for anything about Haiti...', 'Fetching latest headlines...',
        'Latest Headlines from Haiti', 'Stay informed about disasters & unrest', 'Real-time seismic activity monitoring.',
        'Weather tracking and flood warnings.', 'Updates on roadblocks and protests.', 'US Dollars (USD)', 'Haitian Gourdes (HTG)',
        'Current Rate', 'Last updated', 'Patience and persistence lead to success.', 'Many hands make the load light.',
        'Beyond mountains, there are mountains.', 'An empty sack cannot stand up.', 'Speak plainly and be understood.',
        'The rock in the water doesn\'t know the pain of the rock in the sun.', 'God is good.', 'Meaning',
        'Haitian', 'Art, Music & History', 'Kilti', 'Pwoveb', 'Explore', 'Beaches', 'Restaurants', 'Tourist Sites',
        'Discover the', 'Soul', 'of Haiti.', 'Real-time guidance on safety, culture, and the most beautiful spots in the Pearl of the Antilles.',
        'Consulting local experts...', 'Ask about safety, places, or culture...', 'Related Locations', 'Refresh News',
        'Refresh Rate', 'While the official currency is the Haitian Gourde (HTG), many prices are still quoted in "Haitian Dollars" (a legacy unit equal to 5 Gourdes). Always clarify if a price is in Gourdes or Haitian Dollars to avoid confusion.',
        'Haitian culture is a rich tapestry of African, Taino, and European influences. It is a culture of resilience, creativity, and deep spiritual connection.',
        'The vibrant capital, known for its history, art, and the Iron Market.',
        'The historic northern city, gateway to the Citadelle and Sans-Souci.',
        'The cultural capital, famous for its carnival, architecture, and beaches.',
        'A major port in the south, known for its nearby islands and agriculture.',
        'A complex and misunderstood religion that is central to Haitian identity and history.',
        'The heartbeat of Haiti, from traditional drumming to modern Kompa and Rabòday.',
        'World-renowned for its vibrant colors, symbolism, and storytelling.',
        'The first black-led republic and the only nation whose independence was gained as part of a successful slave rebellion.',
        'Hello', 'How are you?', 'I am fine, thank you', 'Please', 'Thank you', 'Where is...?', 'Straight ahead', 'Turn left', 'Turn right', 'I am lost', 'Help!', 'Call the police', 'I need a doctor', 'Where is the hospital?', 'Stop!',
        'City', 'Beach', 'Site', 'Nature', 'Historical Context', 'User Reviews', 'What to See', 'Visitor Tips', 'Close', 'Location Details', 'View on Google Maps',
        'Save Location', 'Saved', 'My Saved Locations', 'No saved locations yet.', 'Remove',
        'Read Article', 'Back to Details', 'Explore Culture', 'Culture Details', 'Map View',
        'Festivals', 'Vibrant celebrations like Carnival and Fête Patronale that showcase Haiti\'s joy and heritage.',
        'Feedback', 'Name', 'Email', 'Message', 'Submit Feedback', 'Thank you for your feedback!', 'Feedback Type', 'Suggestion', 'Issue Report', 'General Feedback', 'Your feedback helps us improve Ayiti Guide for everyone.', 'Send another message',
        'Share', 'Copy Link', 'Link Copied!', 'Share on Twitter', 'Share on Facebook',
        'A private resort on the northern coast, known for its beautiful beaches and water sports.',
        'Famous for its white sand beaches and relaxed atmosphere in the south.',
        'A massive mountaintop fortress, a UNESCO World Heritage site.',
        'The former royal residence of King Henri I, also a UNESCO site.',
        'A series of stunning turquoise pools and waterfalls near Jacmel.',
        'A cool mountain village near Port-au-Prince, popular for hiking.'
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following UI strings into ${lang}. Return a JSON object where the keys are the original English strings and the values are the translations.\n\nStrings: ${JSON.stringify(uiStrings)}`,
        config: { responseMimeType: "application/json" }
      });

      const translations = JSON.parse(response.text || '{}');
      setUiTranslations(translations);
    } catch (error) {
      console.error("UI Translation Error:", error);
    } finally {
      setIsUiTranslating(false);
    }
  };

  useEffect(() => {
    translateUI(targetLanguage);
  }, [targetLanguage]);

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    setTimeout(() => {
      const post: ExperiencePost = {
        id: Math.random().toString(36).substr(2, 9),
        user: 'You',
        content: newPostContent,
        mediaUrl: newPostMedia || undefined,
        mediaType: newPostMediaType,
        likes: 0,
        comments: [],
        timestamp: new Date()
      };
      setPosts([post, ...posts]);
      setNewPostContent('');
      setNewPostMedia(null);
      setIsPosting(false);
    }, 1000);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, { user: 'You', text }] } : p));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostMedia(reader.result as string);
        setNewPostMediaType(file.type.startsWith('video') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const t = (key: string) => uiTranslations[key] || key;
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getAI = () => {
    const apiKey = (process.env as any).API_KEY || process.env.GEMINI_API_KEY || '';
    return new GoogleGenAI({ apiKey });
  };

  const generateLesson = async (topic: string) => {
    if (!topic.trim()) return;
    setIsLessonLoading(true);
    setGeneratedLesson(null);
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a comprehensive, humorous, and pedagogical lesson about Haitian Creole on the topic: "${topic}". 
        Include:
        1. A catchy title.
        2. A humorous introduction.
        3. 3-5 key points or rules with examples.
        4. A "Pro Tip" for sounding like a local.
        5. A short quiz question with answer.
        Format the response as JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              intro: { type: Type.STRING },
              lessons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    point: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    example_kr: { type: Type.STRING },
                    example_en: { type: Type.STRING }
                  }
                }
              },
              proTip: { type: Type.STRING },
              quiz: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                }
              }
            }
          }
        }
      });
      setGeneratedLesson(JSON.parse(response.text));
    } catch (error) {
      console.error("Error generating lesson:", error);
    } finally {
      setIsLessonLoading(false);
    }
  };

  const fetchResources = async (query: string) => {
    if (!query.trim()) return;
    setIsResourcesLoading(true);
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find high-quality, real resources for learning Haitian Creole related to: "${query}". 
        Provide a list of books, websites, videos, or courses. Use Google Search to ensure they are real and current.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri && web.title) || [];
      setResourceLinks(links);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setIsResourcesLoading(false);
    }
  };

  const handleTTS = async (text: string, id: string, voice: string = 'Kore', intonation: string = 'clearly') => {
    if (isSpeaking === id) return;
    setIsSpeaking(id);

    const fallbackTTS = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to find a French voice as it's closest to Creole phonetics in many browsers
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr')) || voices[0];
      if (frVoice) utterance.voice = frVoice;
      utterance.onend = () => setIsSpeaking(null);
      utterance.onerror = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    };

    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say ${intonation}: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || 'audio/wav';

      if (base64Audio) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const binaryString = atob(base64Audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Try standard decoding first
          try {
            const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => setIsSpeaking(null);
            source.start();
          } catch (decodeError) {
            // If standard decoding fails, it might be raw PCM (24kHz, 16-bit, mono)
            console.log("Standard decoding failed, trying raw PCM handling...");
            const pcmData = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
              float32Data[i] = pcmData[i] / 32768.0;
            }
            const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
            audioBuffer.getChannelData(0).set(float32Data);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => setIsSpeaking(null);
            source.start();
          }
        } catch (error) {
          console.error("Audio playback error, falling back to system TTS:", error);
          fallbackTTS();
        }
      } else {
        console.warn("No audio data in response, falling back to system TTS");
        fallbackTTS();
      }
    } catch (error) {
      console.error("TTS Error, falling back to system TTS:", error);
      fallbackTTS();
    }
  };

  const handleSearch = async (query: string = input) => {
    if (!query.trim()) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const genAI = getAI();
      const isProverbQuery = query.toLowerCase().includes('proverb') || query.toLowerCase().includes('pwoveb');
      
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: isProverbQuery ? [{ googleSearch: {} }] : [{ googleMaps: {} }],
          toolConfig: !isProverbQuery ? {
            retrievalConfig: {
              latLng: location ? {
                latitude: location.lat,
                longitude: location.lng
              } : undefined
            }
          } : undefined
        },
      });

      const text = response.text || "I couldn't find specific information for that request.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      const links = groundingChunks
        ?.filter(chunk => chunk.maps)
        .map(chunk => ({
          uri: chunk.maps!.uri,
          title: chunk.maps!.title
        })) || [];

      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        groundingLinks: links
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error while searching for information. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;
    setIsTranslating(true);
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text between English and Haitian Creole. If it's English, translate to Creole. If it's Creole, translate to English. Provide only the translation.\n\nText: "${translationInput}"`,
      });
      setTranslationResult(response.text || "Translation failed.");
    } catch (error) {
      console.error("Translation Error:", error);
      setTranslationResult("Error during translation.");
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchNews = async () => {
    setIsNewsLoading(true);
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `What are the top 5 current news headlines from reliable Haitian news sources today (${new Date().toLocaleDateString()})? Provide a brief summary for each. Focus on local news from sources like Le Nouvelliste, Radio Télé Métropole, and AlterPresse.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      // We'll parse the text into articles. Since the model returns markdown, we'll try to extract titles and summaries.
      // A more robust way would be to ask for JSON, but let's stick to the grounding chunks for links.
      const links = groundingChunks
        ?.filter(chunk => chunk.web)
        .map(chunk => ({
          uri: chunk.web!.uri,
          title: chunk.web!.title
        })) || [];

      // For simplicity in this demo, we'll just display the markdown response and the links.
      // But to match the NewsArticle interface, let's just use the text as a single "article" or split it.
      // Actually, let's just use the markdown for the news content and grounding links for the sources.
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `### Latest News from Haiti\n\n${text}`,
        groundingLinks: links.map(l => ({ uri: l.uri, title: l.title }))
      }]);
      
      // If we want a dedicated news state:
      const articles: NewsArticle[] = links.slice(0, 5).map(link => ({
        title: link.title,
        summary: "Click to read the full story from the source.",
        url: link.uri,
        source: new URL(link.uri).hostname
      }));
      setNews(articles);

    } catch (error) {
      console.error("News Fetch Error:", error);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const fetchMoreProverbs = async () => {
    setIsProverbsLoading(true);
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Provide 10 unique Haitian proverbs (Kreyòl) with their English translations and deep cultural meanings. Format as a JSON array of objects with keys: kr, en, meaning.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kr: { type: Type.STRING },
                en: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["kr", "en", "meaning"]
            }
          }
        }
      });
      
      const newProverbs = JSON.parse(response.text || "[]");
      setProverbsList(prev => [...prev, ...newProverbs]);
    } catch (error) {
      console.error("Proverbs Fetch Error:", error);
    } finally {
      setIsProverbsLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    setIsRateLoading(true);
    try {
      // Using a free public API for exchange rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const rate = data.rates.HTG;
      setExchangeRate(rate);
      if (usdAmount) {
        setHtgAmount((parseFloat(usdAmount) * rate).toFixed(2));
      }
    } catch (error) {
      console.error("Currency Fetch Error:", error);
      // Fallback if API fails
      try {
        const genAI = getAI();
        const response = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "What is the current exchange rate from 1 USD to Haitian Gourde (HTG)? Provide only the number.",
          config: { tools: [{ googleSearch: {} }] }
        });
        const rate = parseFloat(response.text?.replace(/[^0-9.]/g, '') || '0');
        if (rate > 0) {
          setExchangeRate(rate);
          if (usdAmount) setHtgAmount((parseFloat(usdAmount) * rate).toFixed(2));
        }
      } catch (e) {
        console.error("Gemini Currency Error:", e);
      }
    } finally {
      setIsRateLoading(false);
    }
  };

  const fetchLocationDetails = async (loc: Location) => {
    setSelectedLocation(loc);
    setIsDetailsLoading(true);
    setLocationDetails(null);
    setLocationLinks([]);
    setActiveIframeUrl(null);
    
    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide a comprehensive guide for ${loc.name} in Haiti. Include: 1. Historical context. 2. Key attractions (What to See). 3. General user sentiment or reviews. 4. Practical tips for visitors. Use Google Maps grounding to provide accurate location details and links.`,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      const text = response.text || "No detailed information found.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      const links = groundingChunks
        ?.filter(chunk => chunk.maps)
        .map(chunk => ({
          uri: chunk.maps!.uri,
          title: chunk.maps!.title
        })) || [];

      setLocationDetails(text);
      setLocationLinks(links);
    } catch (error) {
      console.error("Location Details Error:", error);
      setLocationDetails("Failed to load details. Please try again.");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const fetchCultureDetails = async (item: { title: string; icon: any; desc: string }) => {
    setSelectedCultureItem(item);
    setIsCultureLoading(true);
    setCultureDetails(null);
    setCultureLinks([]);
    setActiveIframeUrl(null);

    try {
      const genAI = getAI();
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide an in-depth exploration of ${item.title} in the context of Haitian culture. Include historical origins, key figures or elements, and its modern-day significance. Use Google Search to find high-quality articles or resources for further reading.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "No detailed information found.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      const links = groundingChunks
        ?.filter(chunk => chunk.web)
        .map(chunk => ({
          uri: chunk.web!.uri,
          title: chunk.web!.title
        })) || [];

      setCultureDetails(text);
      setCultureLinks(links);
    } catch (error) {
      console.error("Culture Details Error:", error);
      setCultureDetails("Failed to load details. Please try again.");
    } finally {
      setIsCultureLoading(false);
    }
  };

  const toggleSaveLocation = (loc: Location) => {
    setSavedLocations(prev => {
      const isSaved = prev.some(item => item.id === loc.id);
      if (isSaved) {
        return prev.filter(item => item.id !== loc.id);
      } else {
        return [...prev, loc];
      }
    });
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmittingFeedback(false);
    setFeedbackSuccess(true);
    // Reset form
    setFeedbackName('');
    setFeedbackEmail('');
    setFeedbackMessage('');
  };

  const locations: Location[] = [
    { id: 'pap', name: 'Port-au-Prince', lat: 18.5392, lng: -72.3350, category: t('City'), description: t('The vibrant capital, known for its history, art, and the Iron Market.') },
    { id: 'cap', name: 'Cap-Haïtien', lat: 19.7500, lng: -72.2000, category: t('City'), description: t('The historic northern city, gateway to the Citadelle and Sans-Souci.') },
    { id: 'jac', name: 'Jacmel', lat: 18.2333, lng: -72.5333, category: t('City'), description: t('The cultural capital, famous for its carnival, architecture, and beaches.') },
    { id: 'cay', name: 'Les Cayes', lat: 18.1920, lng: -73.7460, category: t('City'), description: t('A major port in the south, known for its nearby islands and agriculture.') },
    { id: 'lab', name: 'Labadee', lat: 19.7833, lng: -72.2500, category: t('Beach'), description: t('A private resort on the northern coast, known for its beautiful beaches and water sports.') },
    { id: 'psa', name: 'Port-Salut', lat: 18.0750, lng: -73.9167, category: t('Beach'), description: t('Famous for its white sand beaches and relaxed atmosphere in the south.') },
    { id: 'cit', name: 'Citadelle Laferrière', lat: 19.5733, lng: -72.2436, category: t('Site'), description: t('A massive mountaintop fortress, a UNESCO World Heritage site.') },
    { id: 'san', name: 'Sans-Souci Palace', lat: 19.6033, lng: -72.2194, category: t('Site'), description: t('The former royal residence of King Henri I, also a UNESCO site.') },
    { id: 'bas', name: 'Bassin Bleu', lat: 18.1833, lng: -72.5500, category: t('Nature'), description: t('A series of stunning turquoise pools and waterfalls near Jacmel.') },
    { id: 'fur', name: 'Furcy', lat: 18.4167, lng: -72.2833, category: t('Nature'), description: t('A cool mountain village near Port-au-Prince, popular for hiking.') },
  ];

  useEffect(() => {
    if (activeTab === 'news' && news.length === 0) {
      fetchNews();
    }
    if (activeTab === 'currency' && !exchangeRate) {
      fetchExchangeRate();
    }
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('location');
    if (locId) {
      const loc = locations.find(l => l.id === locId);
      if (loc) {
        setActiveTab('explore');
        fetchLocationDetails(loc);
      }
    }
  }, []);

  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    if (exchangeRate && !isNaN(parseFloat(val))) {
      setHtgAmount((parseFloat(val) * exchangeRate).toFixed(2));
    } else {
      setHtgAmount('');
    }
  };

  const handleHtgChange = (val: string) => {
    setHtgAmount(val);
    if (exchangeRate && !isNaN(parseFloat(val))) {
      setUsdAmount((parseFloat(val) / exchangeRate).toFixed(2));
    } else {
      setUsdAmount('');
    }
  };

  const handleShare = async (loc: Location) => {
    const shareUrl = `${window.location.origin}?location=${loc.id}`;
    const shareText = `Check out ${loc.name} on Ayiti Guide! ${loc.description || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ayiti Guide',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const categories = [
    { id: 'safety', label: t('Safety Info'), icon: Shield, query: 'What is the current safety situation in Haiti for travelers?' },
    { id: 'places', label: t('Top Places'), icon: MapPin, query: 'What are the top 5 must-visit places in Haiti?' },
    { id: 'food', label: t('Local Food'), icon: Utensils, query: 'What are the best traditional Haitian dishes and where to find them?' },
    { id: 'culture', label: t('Culture'), icon: Info, query: 'Tell me about Haitian culture, music, and traditions.' },
  ];

  const creolePhrases = [
    { category: t('Greetings'), phrases: [
      { en: t('Hello'), kr: 'Bonjou (Morning) / Bonswa (Afternoon)' },
      { en: t('How are you?'), kr: 'Kouman ou ye?' },
      { en: t('I am fine, thank you'), kr: 'Mwen byen, mèsi' },
      { en: t('Please'), kr: 'Tanpri' },
      { en: t('Thank you'), kr: 'Mèsi' },
    ]},
    { category: t('Directions'), phrases: [
      { en: t('Where is...?'), kr: 'Kote... ye?' },
      { en: t('Straight ahead'), kr: 'Dwat devan' },
      { en: t('Turn left'), kr: 'Vire agoch' },
      { en: t('Turn right'), kr: 'Vire adwat' },
      { en: t('I am lost'), kr: 'Mwen pèdi' },
    ]},
    { category: t('Emergencies'), phrases: [
      { en: t('Help!'), kr: 'Anmwe! / Sekou!' },
      { en: t('Call the police'), kr: 'Rele lapolis' },
      { en: t('I need a doctor'), kr: 'Mwen bezwen yon doktè' },
      { en: t('Where is the hospital?'), kr: 'Kote lopital la ye?' },
      { en: t('Stop!'), kr: 'Ret la! / Sispann!' },
    ]},
  ];

  const emergencyContacts = [
    { name: t('Police (PNH)'), number: '114' },
    { name: t('Ambulance (CAN)'), number: '116' },
    { name: t('Red Cross'), number: '118' },
    { name: t('Fire Department'), number: '115' },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 font-serif selection:bg-[#5A5A40] selection:text-white bg-bg-primary text-text-primary">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between transition-colors duration-300",
        darkMode ? "bg-bg-primary/80 border-border-primary" : "bg-bg-primary/80 border-border-primary"
      )}>
        <div className="flex items-center gap-3">
          <Compass className="w-8 h-8 text-[#5A5A40]" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight leading-none">Ayiti Guide</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mt-1">{currentTime.toLocaleTimeString()}</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-sans text-xs uppercase tracking-widest font-bold">
          <button 
            onClick={() => setActiveTab('guide')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'guide' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Guide')}
          </button>
          <button 
            onClick={() => setActiveTab('language')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'language' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Language')}
          </button>
          <button 
            onClick={() => setActiveTab('learn')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'learn' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Learn')}
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'community' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Community')}
          </button>
          <button 
            onClick={() => setActiveTab('crisis')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'crisis' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Crisis Center')}
          </button>
          <button 
            onClick={() => setActiveTab('news')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'news' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('News')}
          </button>
          <button 
            onClick={() => setActiveTab('currency')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'currency' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Currency')}
          </button>
          <button 
            onClick={() => setActiveTab('explore')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'explore' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Explore Map')}
          </button>
          <button 
            onClick={() => setActiveTab('culture')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'culture' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Culture Map')}
          </button>
          <button 
            onClick={() => setActiveTab('proverbs')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'proverbs' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Proverbs Map')}
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'feedback' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Feedback')}
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'video' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Video')}
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={cn("hover:text-[#5A5A40] transition-colors", activeTab === 'community' && "text-[#5A5A40] underline underline-offset-8")}
          >
            {t('Community')}
          </button>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "p-2 rounded-full border transition-all duration-300",
              darkMode 
                ? "bg-bg-secondary/5 border-border-primary text-yellow-400 hover:bg-bg-secondary/10" 
                : "bg-black/5 border-border-primary text-[#5A5A40] hover:bg-black/10"
            )}
            title={darkMode ? t('Switch to Light Mode') : t('Switch to Dark Mode')}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative group">
            <button className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border font-sans text-xs font-bold uppercase tracking-widest transition-all",
              darkMode ? "bg-bg-secondary/5 border-border-primary hover:border-[#5A5A40]" : "bg-bg-secondary border-border-primary hover:border-[#5A5A40]"
            )}>
              <Languages className="w-4 h-4 text-[#5A5A40]" />
              {targetLanguage}
              {isUiTranslating && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
            <div className={cn(
              "absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] max-h-96 overflow-y-auto custom-scrollbar",
              darkMode ? "bg-bg-secondary border-border-primary" : "bg-bg-secondary border-border-primary"
            )}>
              {languages.map(lang => (
                <button
                  key={lang}
                  onClick={() => setTargetLanguage(lang)}
                  className={cn(
                    "w-full text-left px-6 py-3 font-sans text-xs font-bold uppercase tracking-widest transition-colors",
                    targetLanguage === lang 
                      ? "text-[#5A5A40] bg-[#5A5A40]/5" 
                      : "text-text-secondary hover:bg-bg-primary"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="md:hidden">
            <button onClick={() => {
              const tabs: Tab[] = ['guide', 'language', 'crisis', 'news', 'currency', 'explore', 'culture', 'proverbs', 'feedback'];
              const currentIndex = tabs.indexOf(activeTab);
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            }}>
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 pb-32">
        {activeTab === 'guide' && (
          <section className="animate-in fade-in duration-500">
            {messages.length === 0 && (
              <div className="text-center mb-16">
                <h2 className="text-6xl md:text-8xl font-light mb-6 leading-tight">
                  {t('Discover the')} <span className="italic">{t('Soul')}</span> {t('of Haiti.')}
                </h2>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12 font-sans">
                  {t('Real-time guidance on safety, culture, and the most beautiful spots in the Pearl of the Antilles.')}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleSearch(cat.query)}
                      className="group p-6 bg-bg-secondary rounded-3xl border border-border-primary hover:border-[#5A5A40] transition-all duration-300 text-left"
                    >
                      <cat.icon className="w-6 h-6 mb-4 text-[#5A5A40] group-hover:scale-110 transition-transform" />
                      <span className="font-sans font-semibold text-sm uppercase tracking-wider">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={scrollRef} className="space-y-8 mb-12 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-6 rounded-3xl font-sans text-lg leading-relaxed",
                    msg.role === 'user' ? "bg-[#5A5A40] text-white rounded-tr-none" : "bg-bg-secondary border border-border-primary rounded-tl-none shadow-sm"
                  )}>
                    <div className="flex justify-between items-start gap-4">
                      <div className={cn(
                        "prose max-w-none prose-p:leading-relaxed flex-1",
                        darkMode ? "prose-invert" : "prose-stone"
                      )}>
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleTTS(msg.content, `msg-${idx}`)}
                          className={cn(
                            "p-2 rounded-full transition-all shrink-0",
                            isSpeaking === `msg-${idx}` ? "bg-[#5A5A40] text-white animate-pulse" : "hover:bg-[#5A5A40]/10 text-[#5A5A40]"
                          )}
                          title="Read aloud"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border-primary">
                        <p className="text-xs uppercase tracking-widest font-bold mb-3 opacity-60">{t('Related Locations')}</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingLinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-bg-primary hover:bg-[#5A5A40] hover:text-white rounded-full text-sm font-semibold transition-colors border border-border-primary"
                            >
                              <MapPin className="w-3 h-3" />
                              {link.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 text-[#5A5A40] font-sans animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('Consulting local experts...')}</span>
                </div>
              )}
            </div>

            <div className="fixed bottom-8 left-6 right-6 max-w-4xl mx-auto">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('Ask about safety, places, or culture...')}
                  className="w-full bg-bg-secondary border-2 border-border-primary rounded-full px-8 py-6 pr-20 text-xl font-sans shadow-2xl focus:outline-none focus:border-[#5A5A40] transition-all placeholder:text-text-secondary/50"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#5A5A40] text-white p-4 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'language' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Kreyòl <span className="italic">Ayisyen</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">Language & Translation</p>
            </div>

            {/* Translation Tool */}
            <div className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Languages className="w-6 h-6 text-[#5A5A40]" />
                <h3 className="text-xl font-bold">Instant Translator</h3>
              </div>
              <div className="space-y-4">
                <textarea
                  value={translationInput}
                  onChange={(e) => setTranslationInput(e.target.value)}
                  placeholder="Type in English or Creole..."
                  className="w-full h-32 p-6 bg-bg-primary rounded-2xl font-sans text-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 resize-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('Speaker')}</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTtsVoice('Kore')}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                          ttsVoice === 'Kore' ? "bg-[#5A5A40] text-white" : "bg-bg-primary border border-border-primary text-text-secondary"
                        )}
                      >
                        {t('Female')}
                      </button>
                      <button
                        onClick={() => setTtsVoice('Puck')}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                          ttsVoice === 'Puck' ? "bg-[#5A5A40] text-white" : "bg-bg-primary border border-border-primary text-text-secondary"
                        )}
                      >
                        {t('Male')}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('Intonation')}</label>
                    <select
                      value={ttsIntonation}
                      onChange={(e) => setTtsIntonation(e.target.value)}
                      className="w-full py-2 px-4 bg-bg-primary border border-border-primary rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#5A5A40]"
                    >
                      <option value="clearly">{t('Clear')}</option>
                      <option value="cheerful">{t('Cheerful')}</option>
                      <option value="serious">{t('Serious')}</option>
                      <option value="humorous">{t('Humorous')}</option>
                      <option value="whispering">{t('Whispering')}</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || !translationInput.trim()}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
                >
                  {isTranslating ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t('Translate')}
                </button>
                {translationResult && (
                  <div className="mt-6 p-6 bg-[#5A5A40]/5 rounded-2xl border border-[#5A5A40]/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-2">{t('Result')}</p>
                      <p className="text-2xl font-medium">{translationResult}</p>
                    </div>
                    <button
                      onClick={() => handleTTS(translationResult, 'translation', ttsVoice, ttsIntonation)}
                      className={cn(
                        "p-3 rounded-full transition-all",
                        isSpeaking === 'translation' ? "bg-[#5A5A40] text-white animate-pulse" : "hover:bg-[#5A5A40]/10 text-[#5A5A40]"
                      )}
                      title={t('Read aloud')}
                    >
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Essential Phrases */}
            <div className="grid md:grid-cols-1 gap-8">
              {creolePhrases.map((cat, idx) => (
                <div key={idx} className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#5A5A40]" />
                    {cat.category}
                  </h3>
                  <div className="space-y-4">
                    {cat.phrases.map((p, pIdx) => (
                      <div key={pIdx} className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-border-primary last:border-0 group">
                        <span className="font-sans text-text-secondary">{p.en}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-medium text-[#5A5A40]">{p.kr}</span>
                          <button
                            onClick={() => handleTTS(p.kr, `phrase-${idx}-${pIdx}`)}
                            className={cn(
                              "p-2 rounded-full transition-all",
                              isSpeaking === `phrase-${idx}-${pIdx}` ? "bg-[#5A5A40] text-white animate-pulse" : "hover:bg-[#5A5A40]/10 text-[#5A5A40] opacity-0 group-hover:opacity-100"
                            )}
                            title="Read aloud"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'crisis' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">{t('Crisis Center')}</h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Safety & Emergency Alerts')}</p>
            </div>

            {/* Alert Subscription */}
            <div className="bg-[#1a1a1a] text-white rounded-[2rem] p-8 shadow-2xl overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div>
                      <h3 className="text-2xl font-bold">{t('Crisis Center')}</h3>
                      <p className="text-white/60 font-sans text-sm">{t('Stay informed about disasters & unrest')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSubscribed(!isSubscribed)}
                    className={cn(
                      "px-6 py-3 rounded-full font-sans font-bold uppercase tracking-widest transition-all",
                      isSubscribed ? "bg-white/10 text-white border border-white/20" : "bg-red-600 text-white hover:bg-red-700"
                    )}
                  >
                    {isSubscribed ? t('Subscribed') : t('Subscribe Now')}
                  </button>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="font-bold mb-2">{t('Earthquakes')}</h4>
                    <p className="text-xs text-white/50 font-sans">{t('Real-time seismic activity monitoring.')}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="font-bold mb-2">{t('Hurricanes')}</h4>
                    <p className="text-xs text-white/50 font-sans">{t('Weather tracking and flood warnings.')}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="font-bold mb-2">{t('Civil Unrest')}</h4>
                    <p className="text-xs text-white/50 font-sans">{t('Updates on roadblocks and protests.')}</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] -mr-32 -mt-32" />
            </div>

            {/* Emergency Contacts */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#5A5A40]" />
                  {t('Emergency Contacts')}
                </h3>
                <div className="space-y-4">
                  {emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="group p-4 bg-bg-primary rounded-2xl border border-border-primary hover:border-[#5A5A40]/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-lg">{t(contact.name)}</span>
                        <span className="text-2xl font-sans font-bold text-[#5A5A40]">{contact.number}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveEmergency(contact)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#5A5A40] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          {t('Call')}
                        </button>
                        <button
                          onClick={() => {
                            setSmsMessage(`Emergency! I need help. My location: ${location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : 'Unknown'}`);
                            setActiveEmergency(contact);
                            setShowSmsModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-bg-secondary border border-border-primary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-bg-primary transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          {t('SMS')}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(contact.number);
                            // Simple feedback could be added here
                          }}
                          className="p-2 bg-bg-secondary border border-border-primary rounded-xl hover:bg-bg-primary transition-colors"
                          title={t('Copy Number')}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#5A5A40]" />
                  {t('Safety Guidelines')}
                </h3>
                <ul className="space-y-4 font-sans text-sm leading-relaxed text-text-secondary">
                  {[
                    "Always carry a copy of your passport and emergency contacts.",
                    "Avoid walking alone at night, especially in unfamiliar areas.",
                    "In case of an earthquake: Drop, Cover, and Hold On.",
                    "Keep a small amount of local currency (Gourdes) for emergencies."
                  ].map((guide, gIdx) => (
                    <li key={gIdx} className="flex gap-3 group items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] mt-1.5 shrink-0" />
                      <span className="flex-1">{t(guide)}</span>
                      <button
                        onClick={() => handleTTS(guide, `guide-${gIdx}`)}
                        className={cn(
                          "p-1 rounded-full transition-all shrink-0",
                          isSpeaking === `guide-${gIdx}` ? "bg-[#5A5A40] text-white animate-pulse" : "hover:bg-[#5A5A40]/10 text-[#5A5A40] opacity-0 group-hover:opacity-100"
                        )}
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
        {activeTab === 'news' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Ayiti <span className="italic">{t('News')}</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Latest Headlines from Haiti')}</p>
            </div>

            {isNewsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-[#5A5A40] animate-spin" />
                <p className="font-sans text-text-secondary animate-pulse">{t('Fetching latest headlines...')}</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {news.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm hover:border-[#5A5A40] transition-all duration-300 block"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-sans font-bold uppercase tracking-widest text-[#5A5A40] bg-[#5A5A40]/5 px-3 py-1 rounded-full">
                        {article.source}
                      </span>
                      <ExternalLink className="w-4 h-4 text-text-primary/20 group-hover:text-[#5A5A40] transition-colors" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-[#5A5A40] transition-colors leading-tight">
                      {article.title}
                    </h3>
                    <p className="text-text-secondary font-sans leading-relaxed">
                      {article.summary}
                    </p>
                  </a>
                ))}
                
                <button 
                  onClick={fetchNews}
                  className="mt-8 mx-auto flex items-center gap-2 px-8 py-4 bg-[#5A5A40] text-white rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors shadow-lg"
                >
                  <Search className="w-4 h-4" />
                  {t('Refresh News')}
                </button>
              </div>
            )}
          </section>
        )}
        {activeTab === 'currency' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Ayiti <span className="italic">Gourde</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">Currency Converter</p>
            </div>

            <div className="bg-bg-secondary rounded-[2rem] p-10 border border-border-primary shadow-sm max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Banknote className="w-8 h-8 text-[#5A5A40]" />
                  <h3 className="text-2xl font-bold">{t('Currency Converter')}</h3>
                </div>
                <button 
                  onClick={fetchExchangeRate}
                  className="p-3 hover:bg-bg-primary rounded-full transition-colors text-[#5A5A40]"
                  title={t('Refresh Rate')}
                >
                  <RefreshCcw className={cn("w-5 h-5", isRateLoading && "animate-spin")} />
                </button>
              </div>

              <div className="space-y-8">
                {/* USD Input */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">{t('US Dollars (USD)')}</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-sans font-bold text-text-primary/30">$</span>
                    <input
                      type="number"
                      value={usdAmount}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      className="w-full bg-bg-primary rounded-2xl py-6 pl-12 pr-8 text-3xl font-sans font-bold focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all text-text-primary"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-[#5A5A40] p-4 rounded-full text-white shadow-lg">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                </div>

                {/* HTG Input */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">{t('Haitian Gourdes (HTG)')}</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-sans font-bold text-text-primary/30">G</span>
                    <input
                      type="number"
                      value={htgAmount}
                      onChange={(e) => handleHtgChange(e.target.value)}
                      className="w-full bg-bg-primary rounded-2xl py-6 pl-12 pr-8 text-3xl font-sans font-bold focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all text-text-primary"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {exchangeRate && (
                  <div className="pt-8 border-t border-border-primary text-center">
                    <p className="font-sans text-text-secondary">
                      {t('Current Rate')}: <span className="font-bold text-text-primary">1 USD = {exchangeRate.toFixed(2)} HTG</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-2">
                      {t('Last updated')}: {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-2xl mx-auto bg-[#5A5A40]/5 rounded-3xl p-8 border border-[#5A5A40]/10">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5A5A40]" />
                {t('Financial Tip')}
              </h4>
              <p className="text-sm font-sans leading-relaxed text-text-secondary">
                {t('While the official currency is the Haitian Gourde (HTG), many prices are still quoted in "Haitian Dollars" (a legacy unit equal to 5 Gourdes). Always clarify if a price is in Gourdes or Haitian Dollars to avoid confusion.')}
              </p>
            </div>
          </section>
        )}
        {activeTab === 'explore' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">{t('Explore')} <span className="italic">Ayiti</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Beaches, Restaurants & Sites')}</p>
            </div>

            <InteractiveMap 
              locations={locations} 
              onPinClick={fetchLocationDetails} 
              darkMode={darkMode}
            />

            {savedLocations.length > 0 && (
              <div className="animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Heart className="w-6 h-6 text-[#5A5A40] fill-[#5A5A40]" />
                    {t('My Saved Locations')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {savedLocations.map((loc) => (
                    <div 
                      key={loc.id} 
                      className="group bg-bg-secondary rounded-2xl border border-border-primary p-4 hover:border-[#5A5A40] transition-all cursor-pointer shadow-sm flex flex-col"
                      onClick={() => fetchLocationDetails(loc)}
                    >
                      <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-bg-primary">
                        <img 
                          src={`https://images.unsplash.com/photo-1549421263-504527736209?q=80&w=800&auto=format&fit=crop`} 
                          alt={loc.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h4 className="font-bold text-sm mb-1">{loc.name}</h4>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40] mb-3">{loc.category}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveLocation(loc);
                        }}
                        className="mt-auto text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        {t('Remove')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: t('Beaches'), icon: Palmtree, query: 'What are the best beaches in Haiti? Include Labadee, Port-Salut, and Jacmel.' },
                { label: t('Restaurants'), icon: UtensilsCrossed, query: 'What are the best restaurants in Port-au-Prince, Cap-Haïtien, and Jacmel?' },
                { label: t('Tourist Sites'), icon: Landmark, query: 'What are the most important tourist and historical sites in Haiti? Include Citadelle Laferrière and Sans-Souci Palace.' },
              ].map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTab('guide');
                    handleSearch(cat.query);
                  }}
                  className="group p-10 bg-bg-secondary rounded-[2rem] border border-border-primary hover:border-[#5A5A40] transition-all duration-300 text-center shadow-sm"
                >
                  <cat.icon className="w-10 h-10 mb-6 text-[#5A5A40] mx-auto group-hover:scale-110 transition-transform" />
                  <span className="font-sans font-bold text-sm uppercase tracking-widest">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-bg-secondary rounded-[2rem] p-10 border border-border-primary shadow-sm">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6 text-[#5A5A40]" />
                {t('Major Cities Guide')}
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  { city: 'Port-au-Prince', desc: 'The vibrant capital, known for its history, art, and the Iron Market.' },
                  { city: 'Cap-Haïtien', desc: 'The historic northern city, gateway to the Citadelle and Sans-Souci.' },
                  { city: 'Jacmel', desc: 'The cultural capital, famous for its carnival, architecture, and beaches.' },
                  { city: 'Les Cayes', desc: 'A major port in the south, known for its nearby islands and agriculture.' },
                ].map((city, idx) => (
                  <div key={idx} className="p-6 bg-bg-primary rounded-2xl">
                    <h4 className="font-bold text-lg mb-2">{city.city}</h4>
                    <p className="text-sm font-sans text-text-secondary leading-relaxed">{t(city.desc)}</p>
                    <button 
                      onClick={() => {
                        setActiveTab('guide');
                        handleSearch(`Tell me about things to do in ${city.city}, Haiti.`);
                      }}
                      className="mt-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40] hover:underline"
                    >
                      {t('Explore')} {city.city}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'culture' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Ayiti <span className="italic">{t('Kilti')}</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Haitian Culture Map')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                { title: t('Voodoo'), icon: Shield, desc: 'A complex and misunderstood religion that is central to Haitian identity and history.' },
                { title: t('Music (Kompa)'), icon: Music, desc: 'The heartbeat of Haiti, from traditional drumming to modern Kompa and Rabòday.' },
                { title: t('Festivals'), icon: Palmtree, desc: 'Vibrant celebrations like Carnival and Fête Patronale that showcase Haiti\'s joy and heritage.' },
                { title: t('Art (Naïve)'), icon: Heart, desc: 'World-renowned for its vibrant colors, symbolism, and storytelling.' },
                { title: t('History'), icon: Landmark, desc: 'The first black-led republic and the only nation whose independence was gained as part of a successful slave rebellion.' },
              ].map((item, idx) => (
                <div key={idx} className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm hover:border-[#5A5A40] transition-all group">
                  <item.icon className="w-8 h-8 mb-6 text-[#5A5A40] group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="font-sans text-text-secondary leading-relaxed mb-6">{t(item.desc)}</p>
                  <button 
                    onClick={() => fetchCultureDetails(item)}
                    className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] hover:underline flex items-center gap-2"
                  >
                    {t('Learn More')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-[#5A5A40] text-white rounded-[2rem] p-10 shadow-xl">
              <h3 className="text-3xl font-light mb-6 italic">"L'Union Fait la Force"</h3>
              <p className="font-sans text-white/80 leading-relaxed max-w-2xl">
                {t('Haitian culture is a rich tapestry of African, Taino, and European influences. It is a culture of resilience, creativity, and deep spiritual connection.')}
              </p>
            </div>
          </section>
        )}

        {activeTab === 'learn' && (
          <section className="animate-in fade-in duration-500 space-y-16">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">{t('Aprann')} <span className="italic">Kreyòl</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('The Ultimate Comprehensive Learning Hub')}</p>
            </div>

            {/* Dynamic Lesson Generator */}
            <div className="bg-[#5A5A40]/5 rounded-[3rem] p-12 border border-[#5A5A40]/10 shadow-inner">
              <div className="max-w-3xl mx-auto text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                  <Sparkles className="w-3 h-3" />
                  {t('AI-Powered Lessons')}
                </div>
                <h3 className="text-4xl font-light">{t('What do you want to learn today?')}</h3>
                <p className="font-sans text-text-secondary">{t('Ask for any topic: "How to order food", "Grammar: Past Tense", "Haitian Slang", or "Romantic Phrases".')}</p>
                
                <div className="relative group">
                  <input
                    type="text"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generateLesson(lessonTopic)}
                    placeholder={t('Enter a topic...')}
                    className="w-full bg-bg-secondary border-2 border-border-primary rounded-full px-8 py-6 pr-20 text-xl font-sans shadow-2xl focus:outline-none focus:border-[#5A5A40] transition-all placeholder:text-text-secondary/50"
                  />
                  <button
                    onClick={() => generateLesson(lessonTopic)}
                    disabled={isLessonLoading || !lessonTopic.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#5A5A40] text-white p-4 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {isLessonLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                  </button>
                </div>

                {generatedLesson && (
                  <div className="mt-12 text-left bg-bg-secondary rounded-[2.5rem] p-10 border border-border-primary shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
                    <div className="flex justify-between items-start mb-8">
                      <h4 className="text-3xl font-bold text-[#5A5A40]">{generatedLesson.title}</h4>
                      <button 
                        onClick={() => handleTTS(`${generatedLesson.title}. ${generatedLesson.intro}`, 'gen-lesson-intro')}
                        className={cn("p-3 rounded-full", isSpeaking === 'gen-lesson-intro' ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="font-sans text-lg text-text-secondary leading-relaxed mb-10 italic">"{generatedLesson.intro}"</p>
                    
                    <div className="space-y-8">
                      {generatedLesson.lessons.map((l: any, i: number) => (
                        <div key={i} className="bg-bg-primary rounded-2xl p-8 border border-border-primary group hover:border-[#5A5A40]/30 transition-colors">
                          <h5 className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-[10px]">{i + 1}</span>
                            {l.point}
                          </h5>
                          <p className="font-sans text-sm text-text-secondary mb-6 leading-relaxed">{l.explanation}</p>
                          <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border-primary">
                            <div>
                              <p className="text-xl font-medium text-[#5A5A40]">{l.example_kr}</p>
                              <p className="text-xs text-text-secondary italic mt-1">{l.example_en}</p>
                            </div>
                            <button 
                              onClick={() => handleTTS(l.example_kr, `gen-lesson-ex-${i}`)}
                              className={cn("p-2 rounded-full", isSpeaking === `gen-lesson-ex-${i}` ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-10 p-8 bg-[#5A5A40] text-white rounded-3xl space-y-4">
                      <h5 className="text-xs uppercase tracking-widest font-bold opacity-60 flex items-center gap-2">
                        <Star className="w-3 h-3" />
                        {t('Pro Tip')}
                      </h5>
                      <p className="text-xl font-light italic leading-relaxed">"{generatedLesson.proTip}"</p>
                    </div>

                    <div className="mt-8 p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                      <h5 className="text-xs uppercase tracking-widest font-bold text-emerald-600 mb-4">{t('Quick Quiz')}</h5>
                      <p className="font-sans font-medium mb-4">{generatedLesson.quiz.question}</p>
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-emerald-600 hover:underline list-none flex items-center gap-2">
                          {t('Show Answer')}
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <p className="mt-4 font-sans text-sm text-text-secondary p-4 bg-white dark:bg-black/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          {generatedLesson.quiz.answer}
                        </p>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resource Library */}
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-light mb-2">{t('Resource Library')}</h3>
                  <p className="text-text-secondary font-sans text-sm">{t('Search for books, courses, and real-world materials.')}</p>
                </div>
                <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    value={resourceQuery}
                    onChange={(e) => setResourceQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchResources(resourceQuery)}
                    placeholder={t('Search resources...')}
                    className="w-full bg-bg-secondary border border-border-primary rounded-full px-6 py-3 pr-12 text-sm font-sans focus:outline-none focus:border-[#5A5A40] transition-all"
                  />
                  <button
                    onClick={() => fetchResources(resourceQuery)}
                    disabled={isResourcesLoading || !resourceQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#5A5A40] hover:scale-110 transition-all disabled:opacity-50"
                  >
                    {isResourcesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resourceLinks.length > 0 ? (
                  resourceLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-bg-secondary rounded-2xl p-6 border border-border-primary hover:border-[#5A5A40]/30 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-[#5A5A40]/5 rounded-xl text-[#5A5A40] group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                          <ExternalLink className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Link</span>
                      </div>
                      <h4 className="font-bold mb-2 line-clamp-2 group-hover:text-[#5A5A40] transition-colors">{link.title}</h4>
                      <p className="text-xs text-text-secondary font-sans line-clamp-1 opacity-60">{new URL(link.uri).hostname}</p>
                    </a>
                  ))
                ) : (
                  <>
                    <div className="bg-bg-secondary rounded-2xl p-8 border border-border-primary flex flex-col items-center text-center space-y-4 opacity-60">
                      <Book className="w-8 h-8 text-[#5A5A40]" />
                      <h4 className="font-bold">{t('Haitian Creole Dictionary')}</h4>
                      <p className="text-xs font-sans">{t('The most comprehensive digital dictionary.')}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-2xl p-8 border border-border-primary flex flex-col items-center text-center space-y-4 opacity-60">
                      <Video className="w-8 h-8 text-[#5A5A40]" />
                      <h4 className="font-bold">{t('YouTube Channels')}</h4>
                      <p className="text-xs font-sans">{t('Visual and auditory learning from native speakers.')}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-2xl p-8 border border-border-primary flex flex-col items-center text-center space-y-4 opacity-60">
                      <Globe className="w-8 h-8 text-[#5A5A40]" />
                      <h4 className="font-bold">{t('Language Courses')}</h4>
                      <p className="text-xs font-sans">{t('Structured paths for all levels.')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Start Lessons (Static) */}
            <div className="space-y-8">
              <h3 className="text-3xl font-light">{t('Quick Start Lessons')}</h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Lesson 1: The "G" Rule */}
                <div className="bg-bg-secondary rounded-[2.5rem] p-8 border border-border-primary shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BookOpen className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-[#5A5A40] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">{t('Lesson 1')}</span>
                      <h3 className="text-2xl font-bold">{t('The Hidden "G"')}</h3>
                    </div>
                    <p className="font-sans text-text-secondary mb-6 leading-relaxed">
                      {t('In Kreyòl, we don\'t just say "I eat", we say "Mwen manje". But wait! If you want to sound like a real Haitian, you need to master the "G" that isn\'t there.')}
                    </p>
                    <div className="bg-bg-primary rounded-2xl p-6 border border-border-primary space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">{t('Standard')}</p>
                          <p className="text-xl font-medium">Mwen manje</p>
                        </div>
                        <button onClick={() => handleTTS('Mwen manje', 'learn-1-1')} className={cn("p-2 rounded-full", isSpeaking === 'learn-1-1' ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">{t('Pro Tip')}</p>
                          <p className="text-xl font-medium italic">M'manje</p>
                          <p className="text-[10px] text-text-secondary italic">{t('Contract everything. Efficiency is key!')}</p>
                        </div>
                        <button onClick={() => handleTTS("M'manje", 'learn-1-2', 'Puck', 'cheerful')} className={cn("p-2 rounded-full", isSpeaking === 'learn-1-2' ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lesson 2: The "Sak Pase" Mystery */}
                <div className="bg-bg-secondary rounded-[2.5rem] p-8 border border-border-primary shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <MessageSquare className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-[#5A5A40] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">{t('Lesson 2')}</span>
                      <h3 className="text-2xl font-bold">{t('The "Sak Pase" Loop')}</h3>
                    </div>
                    <p className="font-sans text-text-secondary mb-6 leading-relaxed">
                      {t('If someone says "Sak pase?", don\'t you dare say "I am fine". That\'s for textbooks. In the streets, we have a secret code.')}
                    </p>
                    <div className="bg-bg-primary rounded-2xl p-6 border border-border-primary space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-1">{t('Question')}</p>
                          <p className="text-xl font-medium">Sak pase?</p>
                        </div>
                        <button onClick={() => handleTTS('Sak pase?', 'learn-2-1')} className={cn("p-2 rounded-full", isSpeaking === 'learn-2-1' ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">{t('The Only Answer')}</p>
                          <p className="text-xl font-medium italic">N'ap boule!</p>
                          <p className="text-[10px] text-text-secondary italic">{t('Literally: "We are burning!" (In a good way, we hope).')}</p>
                        </div>
                        <button onClick={() => handleTTS("N'ap boule!", 'learn-2-2', 'Kore', 'cheerful')} className={cn("p-2 rounded-full", isSpeaking === 'learn-2-2' ? "bg-[#5A5A40] text-white animate-pulse" : "bg-[#5A5A40]/10 text-[#5A5A40]")}>
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#5A5A40] text-white rounded-[3rem] p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="grid grid-cols-6 gap-4 p-4">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <BookOpen key={i} className="w-12 h-12" />
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-4xl font-light mb-4">{t('Ready for the Final Exam?')}</h3>
                <p className="font-sans text-white/70 max-w-xl mx-auto mb-8">
                  {t('Go to a local market, look at a mango, and say "Woy! Sa a bèl!". If the vendor smiles, you graduated.')}
                </p>
                <button 
                  onClick={() => setActiveTab('language')}
                  className="px-8 py-4 bg-white text-[#5A5A40] rounded-full font-sans font-bold uppercase tracking-widest hover:bg-white/90 transition-all shadow-lg"
                >
                  {t('Back to Translator')}
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'community' && (
          <section className="animate-in fade-in duration-500 space-y-12 max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">{t('Ayiti')} <span className="italic">{t('Community')}</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Share your experiences and stay united')}</p>
            </div>

            {/* Create Post */}
            <div className="bg-bg-secondary rounded-[2.5rem] p-8 border border-border-primary shadow-xl space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-[#5A5A40]/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-[#5A5A40]" />
                </div>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={t('Share your experience in Haiti...')}
                  className="w-full bg-transparent border-none focus:ring-0 text-lg font-sans resize-none placeholder:text-text-secondary/30"
                  rows={3}
                />
              </div>
              
              {newPostMedia && (
                <div className="relative rounded-2xl overflow-hidden border border-border-primary aspect-video bg-bg-primary">
                  {newPostMediaType === 'image' ? (
                    <img src={newPostMedia} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={newPostMedia} className="w-full h-full object-cover" controls />
                  )}
                  <button 
                    onClick={() => setNewPostMedia(null)}
                    className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border-primary">
                <div className="flex gap-2">
                  <label className="p-3 hover:bg-[#5A5A40]/10 rounded-full text-[#5A5A40] cursor-pointer transition-colors">
                    <Image className="w-6 h-6" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <label className="p-3 hover:bg-[#5A5A40]/10 rounded-full text-[#5A5A40] cursor-pointer transition-colors">
                    <Video className="w-6 h-6" />
                    <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <button
                  onClick={handlePost}
                  disabled={isPosting || !newPostContent.trim()}
                  className="px-8 py-3 bg-[#5A5A40] text-white rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  {t('Post')}
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="space-y-8">
              {posts.map((post) => (
                <div key={post.id} className="bg-bg-secondary rounded-[2.5rem] p-8 border border-border-primary shadow-lg space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#5A5A40] text-white flex items-center justify-center font-bold">
                        {post.user[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary">{post.user}</h4>
                        <p className="text-[10px] text-text-secondary uppercase tracking-widest opacity-60">
                          {post.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="font-sans text-lg text-text-primary/80 leading-relaxed">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    <div className="rounded-3xl overflow-hidden border border-border-primary bg-bg-primary aspect-video">
                      {post.mediaType === 'image' ? (
                        <img src={post.mediaUrl} alt="Post content" className="w-full h-full object-cover" />
                      ) : (
                        <video src={post.mediaUrl} className="w-full h-full object-cover" controls />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-4 border-t border-border-primary">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-2 text-text-secondary hover:text-[#5A5A40] transition-colors group"
                    >
                      <ThumbsUp className="w-5 h-5 group-active:scale-125 transition-transform" />
                      <span className="text-sm font-bold">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-text-secondary hover:text-[#5A5A40] transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-bold">{post.comments.length}</span>
                    </button>
                  </div>

                  {post.comments.length > 0 && (
                    <div className="space-y-4 pt-4">
                      {post.comments.map((comment, i) => (
                        <div key={i} className="flex gap-3 bg-bg-primary/50 p-4 rounded-2xl border border-border-primary/30">
                          <div className="w-8 h-8 rounded-full bg-text-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.user[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#5A5A40] mb-1">{comment.user}</p>
                            <p className="text-sm font-sans text-text-secondary">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('Add a comment...')}
                      className="w-full bg-bg-primary border border-border-primary rounded-full px-6 py-3 text-sm font-sans focus:outline-none focus:border-[#5A5A40] transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment(post.id, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'proverbs' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Ayiti <span className="italic">{t('Pwoveb')}</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Haitian Proverbs Map')}</p>
            </div>

            <div className="grid gap-6">
              {proverbsList.map((prov, idx) => (
                <div key={idx} className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm hover:bg-bg-primary transition-colors group relative">
                  <div className="flex justify-between items-start">
                    <Quote className="w-6 h-6 mb-4 text-[#5A5A40] opacity-20 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => handleTTS(prov.kr, `prov-${idx}`)}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        isSpeaking === `prov-${idx}` ? "bg-[#5A5A40] text-white animate-pulse" : "hover:bg-[#5A5A40]/10 text-[#5A5A40] opacity-0 group-hover:opacity-100"
                      )}
                      title="Read aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-[#5A5A40] italic">"{prov.kr}"</h3>
                  <p className="font-sans font-semibold text-text-secondary mb-4">{t(prov.en)}</p>
                  <div className="pt-4 border-t border-border-primary">
                    <p className="text-xs uppercase tracking-widest font-bold opacity-40 mb-1">{t('Meaning')}</p>
                    <p className="font-sans text-sm leading-relaxed">{t(prov.meaning)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-12 space-y-4">
              <button 
                onClick={fetchMoreProverbs}
                disabled={isProverbsLoading}
                className="px-8 py-4 bg-[#5A5A40] text-white rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors shadow-lg flex items-center justify-center gap-2 mx-auto"
              >
                {isProverbsLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('Loading...')}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-5 h-5" />
                    {t('Discover More Proverbs')}
                  </>
                )}
              </button>
              <p className="text-xs text-text-secondary font-sans italic">
                {t('Our AI can generate thousands of proverbs from the rich Haitian oral tradition.')}
              </p>
            </div>
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="animate-in fade-in duration-500 max-w-2xl mx-auto space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">{t('Feedback')}</h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('Your feedback helps us improve Ayiti Guide for everyone.')}</p>
            </div>

            {feedbackSuccess ? (
              <div className="bg-bg-secondary rounded-[2.5rem] p-12 text-center border border-border-primary shadow-xl animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Heart className="w-10 h-10 text-[#5A5A40] fill-[#5A5A40]" />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t('Thank you for your feedback!')}</h3>
                <p className="font-sans text-text-secondary mb-8 leading-relaxed">
                  {t('We appreciate you taking the time to share your thoughts. Our team will review your message soon.')}
                </p>
                <button 
                  onClick={() => setFeedbackSuccess(false)}
                  className="px-8 py-4 bg-[#5A5A40] text-white rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors shadow-lg"
                >
                  {t('Send another message')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="bg-bg-secondary rounded-[2.5rem] p-10 md:p-12 border border-border-primary shadow-xl space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="font-sans text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">{t('Name')}</label>
                    <input 
                      type="text" 
                      required
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      className="w-full px-8 py-4 bg-bg-primary rounded-2xl border border-transparent focus:border-[#5A5A40] focus:bg-bg-secondary transition-all outline-none font-sans text-text-primary"
                      placeholder={t('Your Name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-sans text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">{t('Email')}</label>
                    <input 
                      type="email" 
                      required
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      className="w-full px-8 py-4 bg-bg-primary rounded-2xl border border-transparent focus:border-[#5A5A40] focus:bg-bg-secondary transition-all outline-none font-sans text-text-primary"
                      placeholder={t('Your Email')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">{t('Feedback Type')}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['Suggestion', 'Issue Report', 'General Feedback'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={cn(
                          "px-6 py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest border transition-all",
                          feedbackType === type 
                            ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md" 
                            : "bg-bg-primary text-text-secondary border-transparent hover:border-[#5A5A40]/30"
                        )}
                      >
                        {t(type)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">{t('Message')}</label>
                  <textarea 
                    required
                    rows={6}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="w-full px-8 py-6 bg-bg-primary rounded-[2rem] border border-transparent focus:border-[#5A5A40] focus:bg-bg-secondary transition-all outline-none font-sans resize-none text-text-primary"
                    placeholder={t('Tell us what you think...')}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full py-6 bg-[#5A5A40] text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFeedback ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {t('Submit Feedback')}
                </button>
              </form>
            )}
          </section>
        )}

        {activeTab === 'video' && (
          <section className="animate-in fade-in duration-500 space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light mb-4">Ayiti <span className="italic">{t('Video')}</span></h2>
              <p className="text-text-secondary font-sans uppercase tracking-widest text-xs font-bold">{t('AI Video Generation')}</p>
            </div>

            {!hasApiKey ? (
              <div className="bg-bg-secondary rounded-[2rem] p-12 border border-border-primary text-center space-y-6">
                <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold">{t('API Key Required')}</h3>
                <p className="text-text-secondary font-sans max-w-md mx-auto">
                  {t('To generate videos, you need to select a paid Gemini API key. This is required for the Veo video models.')}
                </p>
                <button
                  onClick={handleSelectKey}
                  className="px-8 py-4 bg-[#5A5A40] text-white rounded-full font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors shadow-lg"
                >
                  {t('Select API Key')}
                </button>
                <p className="text-xs text-text-secondary font-sans">
                  {t('Learn more about')} <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">{t('Gemini API Billing')}</a>
                </p>
              </div>
            ) : (
              <div className="grid gap-8">
                <div className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-widest font-bold opacity-40 block">{t('Video Script / Prompt')}</label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder={t('Describe the video you want to create (e.g., "A cinematic drone shot of Citadelle Laferrière at sunset").')}
                      className="w-full h-32 bg-bg-primary border border-border-primary rounded-2xl p-6 font-sans focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-widest font-bold opacity-40 block">{t('Reference Images (Optional, max 3)')}</label>
                      <span className="text-[10px] text-text-secondary font-sans">{videoImages.length}/3</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {videoImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border-primary">
                          <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setVideoImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {videoImages.length < 3 && (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-border-primary flex flex-col items-center justify-center cursor-pointer hover:border-[#5A5A40] hover:bg-[#5A5A40]/5 transition-all">
                          <Upload className="w-6 h-6 text-text-secondary mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t('Upload')}</span>
                          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={generateVideo}
                    disabled={isVideoGenerating || !videoPrompt}
                    className={cn(
                      "w-full py-6 rounded-full font-sans font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3",
                      isVideoGenerating || !videoPrompt
                        ? "bg-bg-primary text-text-secondary cursor-not-allowed"
                        : "bg-[#5A5A40] text-white hover:bg-[#4A4A30]"
                    )}
                  >
                    {isVideoGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('Generating...')}
                      </>
                    ) : (
                      <>
                        <Film className="w-5 h-5" />
                        {t('Generate Video')}
                      </>
                    )}
                  </button>

                  {videoStatus && (
                    <div className="p-4 bg-bg-primary rounded-2xl border border-border-primary flex items-center gap-3">
                      <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-pulse" />
                      <p className="text-xs font-sans text-text-secondary">{videoStatus}</p>
                    </div>
                  )}
                </div>

                {videoUrl && (
                  <div className="bg-bg-secondary rounded-[2rem] p-8 border border-border-primary shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold">{t('Generated Video')}</h3>
                      <a
                        href={videoUrl}
                        download="ayiti-video.mp4"
                        className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {t('Download')}
                      </a>
                    </div>
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                      <video src={videoUrl} controls className="w-full h-full" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Location Details Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/50">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-3xl font-bold text-text-primary">{selectedLocation.name}</h3>
                  <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mt-1">{selectedLocation.category}</p>
                </div>
                <button 
                  onClick={() => setShowMapView(!showMapView)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                    showMapView 
                      ? "bg-[#5A5A40] text-white" 
                      : "bg-bg-primary text-[#5A5A40] border border-border-primary hover:border-[#5A5A40]"
                  )}
                >
                  <Map className="w-4 h-4" />
                  {showMapView ? t('Show Details') : t('Map View')}
                </button>
                <button 
                  onClick={() => toggleSaveLocation(selectedLocation)}
                  className={cn(
                    "p-3 rounded-full transition-all duration-300 border",
                    savedLocations.some(l => l.id === selectedLocation.id)
                      ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-lg"
                      : "bg-bg-primary text-text-primary/40 border-border-primary hover:border-[#5A5A40] hover:text-[#5A5A40]"
                  )}
                  title={savedLocations.some(l => l.id === selectedLocation.id) ? t('Saved') : t('Save Location')}
                >
                  <Heart className={cn("w-6 h-6", savedLocations.some(l => l.id === selectedLocation.id) && "fill-current")} />
                </button>
                <button 
                  onClick={() => handleShare(selectedLocation)}
                  className={cn(
                    "p-3 rounded-full transition-all duration-300 border flex items-center gap-2",
                    isLinkCopied 
                      ? "bg-emerald-500 text-white border-emerald-500" 
                      : "bg-bg-primary text-text-primary/40 border-border-primary hover:border-[#5A5A40] hover:text-[#5A5A40]"
                  )}
                  title={t('Share')}
                >
                  {isLinkCopied ? (
                    <>
                      <Check className="w-6 h-6" />
                      <span className="text-[10px] font-bold uppercase tracking-widest pr-2">{t('Link Copied!')}</span>
                    </>
                  ) : (
                    <Share2 className="w-6 h-6" />
                  )}
                </button>
              </div>
              <button 
                onClick={() => {
                  setSelectedLocation(null);
                  setShowMapView(false);
                }}
                className="p-3 hover:bg-text-primary/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isDetailsLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-[#5A5A40] animate-spin" />
                  <p className="font-sans text-text-secondary uppercase tracking-widest text-xs font-bold">{t('Consulting local experts...')}</p>
                </div>
              ) : showMapView ? (
                <div className="h-full flex flex-col animate-in fade-in duration-500">
                  <iframe 
                    src={`https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}&z=19&t=k&output=embed`}
                    className="w-full flex-1 rounded-3xl border border-border-primary shadow-inner min-h-[400px]"
                    title="Location Map"
                    allowFullScreen
                  />
                </div>
              ) : activeIframeUrl ? (
                <div className="h-full flex flex-col animate-in slide-in-from-bottom duration-500">
                  <button 
                    onClick={() => setActiveIframeUrl(null)}
                    className="mb-4 self-start flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5A5A40] hover:underline"
                  >
                    <ArrowLeftRight className="w-3 h-3 rotate-180" />
                    {t('Back to Details')}
                  </button>
                  <iframe 
                    src={activeIframeUrl}
                    className="w-full flex-1 rounded-3xl border border-border-primary shadow-inner"
                    title="External Content"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Hero Image Placeholder */}
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-bg-primary">
                    <img 
                      src={`https://source.unsplash.com/featured/?${selectedLocation.name.replace(' ', '+')},Haiti`} 
                      alt={selectedLocation.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  {/* Details Grid */}
                  <div className="grid md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-8">
                      <div className="prose prose-slate max-w-none font-sans text-text-primary/80 leading-relaxed dark:prose-invert">
                        <ReactMarkdown>{locationDetails || ''}</ReactMarkdown>
                      </div>

                      {locationLinks.length > 0 && (
                        <div className="pt-8 border-t border-border-primary">
                          <h4 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4">{t('Related Locations')}</h4>
                          <div className="flex flex-wrap gap-3">
                            {locationLinks.map((link, idx) => (
                              <button 
                                key={idx}
                                onClick={() => setActiveIframeUrl(link.uri)}
                                className="flex items-center gap-2 px-4 py-2 bg-bg-primary rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#5A5A40] hover:text-white transition-all"
                              >
                                <MapPin className="w-3 h-3" />
                                {link.title}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8">
                      <div className="bg-bg-primary rounded-3xl p-6 space-y-6">
                        <div className="flex items-center gap-3 text-[#5A5A40]">
                          <Star className="w-5 h-5" />
                          <h4 className="font-bold uppercase tracking-widest text-xs">{t('User Reviews')}</h4>
                        </div>
                        <p className="text-sm font-sans italic text-text-secondary">
                          {t('Gemini is analyzing recent visitor feedback to provide a summary of the general sentiment.')}
                        </p>
                      </div>

                      <div className="bg-[#5A5A40]/5 rounded-3xl p-6 space-y-6 border border-[#5A5A40]/10">
                        <div className="flex items-center gap-3 text-[#5A5A40]">
                          <History className="w-5 h-5" />
                          <h4 className="font-bold uppercase tracking-widest text-xs">{t('Historical Context')}</h4>
                        </div>
                        <p className="text-sm font-sans text-text-secondary leading-relaxed">
                          {t('This location holds significant cultural and historical importance in the development of the Haitian nation.')}
                        </p>
                      </div>

                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-[#5A5A40] text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('View on Google Maps')}
                      </a>

                      <button 
                        onClick={() => setActiveIframeUrl(`https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}&z=15&output=embed`)}
                        className="w-full py-4 bg-text-primary/5 text-text-primary rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-text-primary/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        {t('Map View')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Culture Details Modal */}
      {selectedCultureItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/50">
              <div className="flex items-center gap-4">
                <selectedCultureItem.icon className="w-8 h-8 text-[#5A5A40]" />
                <div>
                  <h3 className="text-3xl font-bold text-text-primary">{selectedCultureItem.title}</h3>
                  <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mt-1">{t('Culture Details')}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedCultureItem(null);
                  setActiveIframeUrl(null);
                }}
                className="p-3 hover:bg-text-primary/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isCultureLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-[#5A5A40] animate-spin" />
                  <p className="font-sans text-text-secondary uppercase tracking-widest text-xs font-bold">{t('Consulting local experts...')}</p>
                </div>
              ) : activeIframeUrl ? (
                <div className="h-full flex flex-col animate-in slide-in-from-bottom duration-500">
                  <button 
                    onClick={() => setActiveIframeUrl(null)}
                    className="mb-4 self-start flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5A5A40] hover:underline"
                  >
                    <ArrowLeftRight className="w-3 h-3 rotate-180" />
                    {t('Back to Details')}
                  </button>
                  <iframe 
                    src={activeIframeUrl}
                    className="w-full flex-1 rounded-3xl border border-border-primary shadow-inner"
                    title="External Article"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="prose prose-slate max-w-none font-sans text-text-primary/80 leading-relaxed dark:prose-invert">
                    <ReactMarkdown>{cultureDetails || ''}</ReactMarkdown>
                  </div>

                  {cultureLinks.length > 0 && (
                    <div className="pt-8 border-t border-border-primary">
                      <h4 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4">{t('Read Article')}</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {cultureLinks.map((link, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setActiveIframeUrl(link.uri)}
                            className="flex items-center justify-between p-6 bg-bg-primary rounded-2xl text-left hover:bg-[#5A5A40] hover:text-white transition-all group"
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-sm line-clamp-1">{link.title}</p>
                              <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-hover:opacity-100">{new URL(link.uri).hostname}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modals */}
      {activeEmergency && !showSmsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-primary w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-border-primary animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <PhoneCall className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">{t('Confirm Call')}</h3>
            <p className="text-text-secondary text-center font-sans mb-8">
              {t('Are you sure you want to call')} <span className="font-bold text-text-primary">{activeEmergency.name}</span> ({activeEmergency.number})?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveEmergency(null)}
                className="py-4 bg-bg-secondary border border-border-primary rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-bg-primary transition-colors"
              >
                {t('Cancel')}
              </button>
              <a
                href={`tel:${activeEmergency.number}`}
                onClick={() => setActiveEmergency(null)}
                className="py-4 bg-red-600 text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-red-700 transition-colors text-center"
              >
                {t('Call Now')}
              </a>
            </div>
          </div>
        </div>
      )}

      {showSmsModal && activeEmergency && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-primary w-full max-md rounded-[2.5rem] p-8 shadow-2xl border border-border-primary animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">{t('Quick SOS SMS')}</h3>
              <button onClick={() => { setShowSmsModal(false); setActiveEmergency(null); }} className="p-2 hover:bg-bg-secondary rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-text-secondary font-sans mb-4">
              {t('Send a quick status update and your location to')} <span className="font-bold text-text-primary">{activeEmergency.name}</span>.
            </p>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="w-full h-32 p-4 bg-bg-secondary border border-border-primary rounded-2xl font-sans text-sm resize-none mb-6 focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
            />
            <div className="flex gap-4">
              <a
                href={`sms:${activeEmergency.number}?body=${encodeURIComponent(smsMessage)}`}
                onClick={() => { setShowSmsModal(false); setActiveEmergency(null); }}
                className="flex-1 py-4 bg-[#5A5A40] text-white rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors text-center flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {t('Send SMS')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-primary px-6 py-4 flex justify-around items-center z-50 overflow-x-auto">
        <button onClick={() => setActiveTab('guide')} className={cn("p-2 shrink-0", activeTab === 'guide' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Guide')}>
          <Search className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('language')} className={cn("p-2 shrink-0", activeTab === 'language' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Language')}>
          <Languages className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('learn')} className={cn("p-2 shrink-0", activeTab === 'learn' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Learn')}>
          <BookOpen className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('community')} className={cn("p-2 shrink-0", activeTab === 'community' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Community')}>
          <MessageSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('crisis')} className={cn("p-2 shrink-0", activeTab === 'crisis' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Crisis')}>
          <AlertTriangle className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('news')} className={cn("p-2", activeTab === 'news' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('News')}>
          <Newspaper className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('currency')} className={cn("p-2", activeTab === 'currency' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Currency')}>
          <Banknote className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('explore')} className={cn("p-2", activeTab === 'explore' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Explore')}>
          <Palmtree className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('culture')} className={cn("p-2", activeTab === 'culture' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Culture')}>
          <Music className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('proverbs')} className={cn("p-2", activeTab === 'proverbs' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Proverbs')}>
          <Quote className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('feedback')} className={cn("p-2", activeTab === 'feedback' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Feedback')}>
          <MessageSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('video')} className={cn("p-2", activeTab === 'video' ? "text-[#5A5A40]" : "text-text-primary/40")} title={t('Video')}>
          <Film className="w-6 h-6" />
        </button>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(90, 90, 64, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(90, 90, 64, 0.4);
        }
      `}} />
    </div>
  );
}

