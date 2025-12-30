import React, { useState, useCallback, useEffect, useRef } from "react";
import "./ComposeContent.css";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaReddit, FaTelegram, FaPinterest } from "react-icons/fa";
import { FaTiktok, FaThreads, FaBluesky, FaSnapchat } from "react-icons/fa6";
import { SiX, SiGooglemybusiness } from "react-icons/si";
import { useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, useDisclosure } from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { baseURL } from "../utils/constants";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../utils/supabaseClient";

export const ComposeContent = () => {
  const { user } = useAuth();
  const [post, setPost] = useState({ text: "", media: null });
  const [networks, setNetworks] = useState({
    threads: false,
    telegram: false,
    twitter: false,
    googleBusiness: false,
    pinterest: false,
    tiktok: false,
    snapchat: false,
    instagram: false,
    bluesky: false,
    youtube: false,
    linkedin: false,
    facebook: false,
    reddit: false
  });
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreviewPlatform, setSelectedPreviewPlatform] = useState("instagram");
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Fetch connected accounts from Ayrshare on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;

      try {
        const res = await fetch(`${baseURL}/api/user-accounts?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          console.log("Connected accounts from Ayrshare:", data.activeSocialAccounts);
          setConnectedAccounts(data.activeSocialAccounts || []);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };
    fetchAccounts();
  }, [user]);

  // Load draft from sessionStorage if coming from Posts page
  useEffect(() => {
    const loadDraftData = sessionStorage.getItem("loadDraft");
    if (loadDraftData) {
      try {
        const draft = JSON.parse(loadDraftData);

        // Set the draft ID so we update instead of create new
        setCurrentDraftId(draft.id);

        // Load caption
        if (draft.caption) {
          setPost(prev => ({ ...prev, text: draft.caption }));
        }

        // Load media preview
        if (draft.media_urls && draft.media_urls.length > 0) {
          setMediaPreview(draft.media_urls[0]);
          const url = draft.media_urls[0].toLowerCase();
          if (url.includes('video') || url.endsWith('.mp4') || url.endsWith('.mov')) {
            setMediaType('video');
          } else {
            setMediaType('image');
          }
        }

        // Load selected platforms
        if (draft.platforms && draft.platforms.length > 0) {
          const platformsObj = {};
          Object.keys(networks).forEach(key => {
            platformsObj[key] = draft.platforms.includes(key);
          });
          setNetworks(platformsObj);
        }

        // Load scheduled date
        if (draft.scheduled_date) {
          setScheduledDate(new Date(draft.scheduled_date));
        }

        // Clear from sessionStorage
        sessionStorage.removeItem("loadDraft");

        toast({
          title: "Draft loaded",
          description: "Continue editing your draft",
          status: "info",
          duration: 2000,
          isClosable: true
        });
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []); // Run once on mount

  // Auto-save draft functionality
  const saveDraft = useCallback(async () => {
    if (!user) return;

    // Don't save if there's no content
    const selectedPlatforms = Object.keys(networks).filter(key => networks[key]);
    if (!post.text && !mediaPreview && selectedPlatforms.length === 0) {
      return;
    }

    try {
      const draftData = {
        user_id: user.id,
        caption: post.text,
        media_urls: mediaPreview ? [mediaPreview] : [],
        platforms: selectedPlatforms,
        scheduled_date: scheduledDate ? scheduledDate.toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (currentDraftId) {
        // UPDATE existing draft using the ID
        const { error } = await supabase
          .from("post_drafts")
          .update(draftData)
          .eq("id", currentDraftId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // CREATE new draft only if we don't have an ID
        const { data, error } = await supabase
          .from("post_drafts")
          .insert([draftData])
          .select()
          .single();

        if (error) throw error;
        if (data) setCurrentDraftId(data.id); // Store the ID for future updates
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  }, [user, post.text, mediaPreview, networks, scheduledDate, currentDraftId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (post.text || mediaPreview || Object.values(networks).some(v => v)) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [post.text, mediaPreview, networks, saveDraft]);

  // Save when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraft();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveDraft();
    };
  }, [saveDraft]);

  // Map Ayrshare platform names to our internal names
  const platformNameMap = {
    'facebook': 'facebook',
    'instagram': 'instagram',
    'x/twitter': 'twitter',
    'twitter': 'twitter',
    'linkedin': 'linkedin',
    'youtube': 'youtube',
    'tiktok': 'tiktok',
    'pinterest': 'pinterest',
    'reddit': 'reddit',
    'telegram': 'telegram',
    'bluesky': 'bluesky',
    'snapchat': 'snapchat',
    'threads': 'threads',
    'google business': 'googleBusiness'
  };

  // Check if a platform is linked
  const isLinked = (platformKey) => {
    return connectedAccounts.some(account => {
      const normalized = account.name?.toLowerCase();
      const mapped = platformNameMap[normalized];
      return mapped === platformKey;
    });
  };

  const socialNetworks = [
    { name: "threads", displayName: "Threads", icon: FaThreads, color: "#000000" },
    { name: "telegram", displayName: "Telegram", icon: FaTelegram, color: "#0088cc" },
    { name: "twitter", displayName: "Twitter", icon: SiX, color: "#000000" },
    { name: "googleBusiness", displayName: "Google Business", icon: SiGooglemybusiness, color: "#4285F4" },
    { name: "pinterest", displayName: "Pinterest", icon: FaPinterest, color: "#BD081C" },
    { name: "tiktok", displayName: "TikTok", icon: FaTiktok, color: "#000000" },
    { name: "snapchat", displayName: "Snapchat", icon: FaSnapchat, color: "#FFFC00" },
    { name: "instagram", displayName: "Instagram", icon: FaInstagram, color: "#E4405F" },
    { name: "bluesky", displayName: "BlueSky", icon: FaBluesky, color: "#1185FE" },
    { name: "youtube", displayName: "Youtube", icon: FaYoutube, color: "#FF0000" },
    { name: "linkedin", displayName: "LinkedIn", icon: FaLinkedinIn, color: "#0A66C2" },
    { name: "facebook", displayName: "Facebook", icon: FaFacebookF, color: "#1877F2" },
    { name: "reddit", displayName: "Reddit", icon: FaReddit, color: "#FF4500" }
  ].map(network => ({
    ...network,
    linked: isLinked(network.name)
  }));

  const handleTextChange = (e) => {
    setPost({ ...post, text: e.target.value });
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPost({ ...post, media: file });
      setMediaType(file.type.split("/")[0]);

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNetworkToggle = useCallback((networkName, isLinked) => {
    if (!isLinked) return; // Can't select unlinked networks
    setNetworks((prev) => ({
      ...prev,
      [networkName]: !prev[networkName]
    }));
  }, []);

  const handleSchedule = (date) => {
    setScheduledDate(date);
    onClose();
  };

  const platformPreviewOptions = [
    { value: "instagram", label: "Instagram", icon: FaInstagram },
    { value: "facebook", label: "Facebook", icon: FaFacebookF },
    { value: "twitter", label: "Twitter/X", icon: SiX },
    { value: "linkedin", label: "LinkedIn", icon: FaLinkedinIn },
    { value: "threads", label: "Threads", icon: FaThreads },
    { value: "tiktok", label: "TikTok", icon: FaTiktok }
  ];

  const renderPlatformPreview = () => {
    const hasContent = post.text || mediaPreview;

    if (!hasContent) {
      return (
        <p className="preview-placeholder">
          Your post preview will appear here
        </p>
      );
    }

    switch (selectedPreviewPlatform) {
      case "instagram":
        return (
          <div className="platform-preview instagram-preview">
            {/* Instagram Status Bar */}
            <div className="status-bar">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Instagram Header */}
            <div className="instagram-header">
              <span className="header-logo">Instagram</span>
              <div className="header-icons">
                <span>♡</span>
                <span>✈</span>
              </div>
            </div>

            {/* Stories Row */}
            <div className="instagram-stories">
              <div className="story-item">
                <div className="story-avatar active">👤</div>
                <span className="story-name">Your story</span>
              </div>
              <div className="story-item">
                <div className="story-avatar">👤</div>
                <span className="story-name">friend1</span>
              </div>
              <div className="story-item">
                <div className="story-avatar">👤</div>
                <span className="story-name">friend2</span>
              </div>
            </div>

            {/* Post */}
            <div className="instagram-post">
              <div className="post-header">
                <div className="post-profile">
                  <div className="preview-avatar">👤</div>
                  <div className="preview-username">your_username</div>
                </div>
                <div className="preview-menu">⋯</div>
              </div>

              {mediaPreview && (
                <div className="post-media">
                  {mediaType === "image" ? (
                    <img src={mediaPreview} alt="Preview" />
                  ) : (
                    <video src={mediaPreview} controls style={{ width: '100%', height: 'auto' }} />
                  )}
                </div>
              )}

              <div className="post-actions">
                <div className="action-icons">
                  <span>♡</span>
                  <span>💬</span>
                  <span>✈</span>
                </div>
                <span>🔖</span>
              </div>

              <div className="post-likes">1,234 likes</div>

              {post.text && (
                <div className="post-caption">
                  <span className="caption-username">your_username</span> {post.text}
                </div>
              )}

              <div className="post-time">2 HOURS AGO</div>
            </div>

            {/* Instagram Bottom Nav */}
            <div className="instagram-nav">
              <span>🏠</span>
              <span>🔍</span>
              <span>➕</span>
              <span>❤️</span>
              <span>👤</span>
            </div>
          </div>
        );

      case "facebook":
        return (
          <div className="platform-preview facebook-preview">
            {/* Status Bar */}
            <div className="status-bar">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Facebook Header */}
            <div className="facebook-header">
              <span className="fb-logo">facebook</span>
              <div className="fb-header-icons">
                <span>🔍</span>
                <span>💬</span>
              </div>
            </div>

            {/* Feed Tabs */}
            <div className="facebook-tabs">
              <div className="fb-tab active">
                <span>🏠</span>
                <span>Home</span>
              </div>
              <div className="fb-tab">
                <span>📺</span>
                <span>Watch</span>
              </div>
              <div className="fb-tab">
                <span>🛍️</span>
                <span>Marketplace</span>
              </div>
            </div>

            {/* Facebook Post */}
            <div className="facebook-feed">
              <div className="fb-post">
                <div className="fb-post-header">
                  <div className="fb-post-profile">
                    <div className="preview-avatar">👤</div>
                    <div className="fb-post-meta">
                      <div className="preview-username">Your Name</div>
                      <div className="preview-timestamp">Just Now · 🌍</div>
                    </div>
                  </div>
                  <div className="preview-menu">⋯</div>
                </div>

                {post.text && (
                  <div className="fb-post-text">{post.text}</div>
                )}

                {mediaPreview && (
                  <div className="fb-post-media">
                    {mediaType === "image" ? (
                      <img src={mediaPreview} alt="Preview" />
                    ) : (
                      <video src={mediaPreview} controls />
                    )}
                  </div>
                )}

                <div className="fb-post-engagement">
                  <span>👍❤😆 120</span>
                  <span>23 comments</span>
                </div>

                <div className="fb-post-actions">
                  <button>👍 Like</button>
                  <button>💬 Comment</button>
                  <button>↗ Share</button>
                </div>
              </div>
            </div>

            {/* Facebook Bottom Nav */}
            <div className="facebook-nav">
              <span>🏠</span>
              <span>👥</span>
              <span>📺</span>
              <span>🛍️</span>
              <span>🔔</span>
              <span>☰</span>
            </div>
          </div>
        );

      case "twitter":
        return (
          <div className="platform-preview twitter-preview">
            {/* Status Bar */}
            <div className="status-bar">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Twitter Header */}
            <div className="twitter-header">
              <div className="twitter-avatar-small">👤</div>
              <span className="twitter-logo">𝕏</span>
              <span className="twitter-settings">⚙️</span>
            </div>

            {/* Timeline Tabs */}
            <div className="twitter-tabs">
              <div className="twitter-tab active">For you</div>
              <div className="twitter-tab">Following</div>
            </div>

            {/* Tweet */}
            <div className="twitter-feed">
              <div className="tweet">
                <div className="tweet-avatar">👤</div>
                <div className="tweet-content">
                  <div className="tweet-header">
                    <span className="tweet-name">Your Name</span>
                    <span className="tweet-handle">@yourhandle · now</span>
                  </div>

                  {post.text && (
                    <div className="tweet-text">{post.text}</div>
                  )}

                  {mediaPreview && (
                    <div className="tweet-media">
                      {mediaType === "image" ? (
                        <img src={mediaPreview} alt="Preview" />
                      ) : (
                        <video src={mediaPreview} controls />
                      )}
                    </div>
                  )}

                  <div className="tweet-actions">
                    <span>💬 0</span>
                    <span>🔁 0</span>
                    <span>♡ 0</span>
                    <span>📊 0</span>
                    <span>↗</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Twitter Bottom Nav */}
            <div className="twitter-nav">
              <span>🏠</span>
              <span>🔍</span>
              <span>🔔</span>
              <span>✉️</span>
            </div>
          </div>
        );

      case "linkedin":
        return (
          <div className="platform-preview linkedin-preview">
            {/* Status Bar */}
            <div className="status-bar">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* LinkedIn Header */}
            <div className="linkedin-header">
              <div className="linkedin-search">
                <span>🔍</span>
                <span className="search-text">Search</span>
              </div>
              <div className="linkedin-header-icons">
                <span>💬</span>
              </div>
            </div>

            {/* LinkedIn Feed */}
            <div className="linkedin-feed">
              <div className="linkedin-post">
                <div className="linkedin-post-header">
                  <div className="linkedin-profile">
                    <div className="preview-avatar">👤</div>
                    <div className="linkedin-meta">
                      <div className="preview-username">Your Name</div>
                      <div className="linkedin-headline">Your Headline</div>
                      <div className="preview-timestamp">Just now · 🌍</div>
                    </div>
                  </div>
                  <div className="preview-menu">⋯</div>
                </div>

                {post.text && (
                  <div className="linkedin-post-text">{post.text}</div>
                )}

                {mediaPreview && (
                  <div className="linkedin-post-media">
                    {mediaType === "image" ? (
                      <img src={mediaPreview} alt="Preview" />
                    ) : (
                      <video src={mediaPreview} controls />
                    )}
                  </div>
                )}

                <div className="linkedin-post-stats">
                  <span>👍 120 · 23 comments</span>
                </div>

                <div className="linkedin-post-actions">
                  <button>👍 Like</button>
                  <button>💬 Comment</button>
                  <button>🔁 Repost</button>
                  <button>↗ Send</button>
                </div>
              </div>
            </div>

            {/* LinkedIn Bottom Nav */}
            <div className="linkedin-nav">
              <span>🏠<br/>Home</span>
              <span>👥<br/>Network</span>
              <span>➕<br/>Post</span>
              <span>🔔<br/>Notifications</span>
              <span>💼<br/>Jobs</span>
            </div>
          </div>
        );

      case "threads":
        return (
          <div className="platform-preview threads-preview">
            {/* Status Bar */}
            <div className="status-bar">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Threads Header */}
            <div className="threads-header">
              <span className="threads-logo">@</span>
              <div className="threads-header-icons">
                <span>♡</span>
              </div>
            </div>

            {/* Threads Feed */}
            <div className="threads-feed">
              <div className="thread-post">
                <div className="thread-post-header">
                  <div className="thread-profile">
                    <div className="preview-avatar">👤</div>
                    <div className="thread-meta">
                      <span className="preview-username">your_username</span>
                      <span className="thread-verified">✓</span>
                    </div>
                  </div>
                  <div className="thread-time">now</div>
                </div>

                {post.text && (
                  <div className="thread-text">{post.text}</div>
                )}

                {mediaPreview && (
                  <div className="thread-media">
                    {mediaType === "image" ? (
                      <img src={mediaPreview} alt="Preview" />
                    ) : (
                      <video src={mediaPreview} controls />
                    )}
                  </div>
                )}

                <div className="thread-actions">
                  <span>♡</span>
                  <span>💬</span>
                  <span>🔁</span>
                  <span>↗</span>
                </div>

                <div className="thread-stats">
                  <span>12 replies · 234 likes</span>
                </div>
              </div>
            </div>

            {/* Threads Bottom Nav */}
            <div className="threads-nav">
              <span>🏠</span>
              <span>🔍</span>
              <span>✏️</span>
              <span>❤️</span>
              <span>👤</span>
            </div>
          </div>
        );

      case "tiktok":
        return (
          <div className="platform-preview tiktok-preview">
            {/* Status Bar */}
            <div className="status-bar tiktok-status">
              <span className="status-time">9:41</span>
              <div className="status-icons">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* TikTok Header */}
            <div className="tiktok-header">
              <span>Following</span>
              <span className="tiktok-tab-active">For You</span>
            </div>

            {/* TikTok Video Content */}
            <div className="tiktok-video">
              {mediaPreview && (
                <div className="tiktok-video-bg">
                  {mediaType === "image" ? (
                    <img src={mediaPreview} alt="Preview" />
                  ) : (
                    <video src={mediaPreview} controls style={{ width: '100%', height: 'auto' }} />
                  )}
                </div>
              )}

              {/* User Info & Caption */}
              <div className="tiktok-info">
                <div className="tiktok-user">
                  <span className="tiktok-username">@yourusername</span>
                  <button className="tiktok-follow">Follow</button>
                </div>
                {post.text && (
                  <div className="tiktok-caption">{post.text}</div>
                )}
                <div className="tiktok-sound">🎵 Original sound - yourusername</div>
              </div>

              {/* Right Sidebar Actions */}
              <div className="tiktok-sidebar">
                <div className="tiktok-sidebar-item">
                  <div className="tiktok-avatar">👤</div>
                </div>
                <div className="tiktok-sidebar-item">
                  <span>♡</span>
                  <span className="count">12.3K</span>
                </div>
                <div className="tiktok-sidebar-item">
                  <span>💬</span>
                  <span className="count">234</span>
                </div>
                <div className="tiktok-sidebar-item">
                  <span>🔖</span>
                  <span className="count">567</span>
                </div>
                <div className="tiktok-sidebar-item">
                  <span>↗</span>
                  <span className="count">89</span>
                </div>
              </div>
            </div>

            {/* TikTok Bottom Nav */}
            <div className="tiktok-nav">
              <span>🏠<br/>Home</span>
              <span>👥<br/>Friends</span>
              <span className="tiktok-create">➕</span>
              <span>💬<br/>Inbox</span>
              <span>👤<br/>Profile</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to post.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("text", post.text);
    formData.append("userId", user.id);
    if (post.media) {
      formData.append("media", post.media);
    }
    formData.append("networks", JSON.stringify(networks));
    if (scheduledDate) {
      formData.append("scheduledDate", scheduledDate.toISOString());
    }

    try {
      const response = await fetch(`${baseURL}/api/post`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        // Delete draft after successful posting
        if (currentDraftId) {
          try {
            await supabase
              .from("post_drafts")
              .delete()
              .eq("id", currentDraftId)
              .eq("user_id", user.id);
          } catch (error) {
            console.error("Error deleting draft:", error);
          }
        }

        toast({
          title: scheduledDate ? "Post scheduled." : "Post submitted.",
          description: scheduledDate
            ? `Your post was scheduled for ${scheduledDate.toLocaleString()}.`
            : "Your post was successfully submitted.",
          status: "success",
          duration: 3000,
          isClosable: true
        });
        // Reset form
        setPost({ text: "", media: null });
        setNetworks({
          threads: false,
          telegram: false,
          twitter: false,
          googleBusiness: false,
          pinterest: false,
          tiktok: false,
          snapchat: false,
          instagram: false,
          bluesky: false,
          youtube: false,
          linkedin: false,
          facebook: false,
          reddit: false
        });
        setMediaPreview(null);
        setMediaType(null);
        setScheduledDate(null);
        setCurrentDraftId(null);
        setLastSaved(null);
      } else {
        throw new Error("Failed to submit post");
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      toast({
        title: "An error occurred.",
        description: "Unable to submit your post.",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="compose-content">
      {/* Top Row - Create Post and Socials */}
      <div className="compose-top-row">
        {/* Left - Create Post */}
        <div className="compose-left">
          <div className="compose-header">
            <h2 className="compose-title">Create a Post</h2>
            <p className="compose-subtitle">
              Create a high-performing post to get your message across.
            </p>
          </div>

          <div className="compose-form">
            <div className="textarea-container">
              <textarea
                value={post.text}
                onChange={handleTextChange}
                placeholder="What would you like to share?"
                className="compose-textarea"
              />
            </div>

            <div className="form-footer">
              <div className="form-actions">
                <label htmlFor="media-upload" className="media-upload-btn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
                  </svg>
                </label>
                <input
                  id="media-upload"
                  type="file"
                  onChange={handleMediaChange}
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                />
              </div>

              <div className="form-buttons">
                {lastSaved && (
                  <span style={{
                    fontSize: '12px',
                    color: 'rgba(0,0,0,0.5)',
                    marginRight: '10px'
                  }}>
                    Draft saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
                <button className="btn-schedule" onClick={onOpen}>Schedule Post</button>
                <button className="btn-post" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Posting..." : "Post Now"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Social Media Selector */}
        <div className="compose-socials">
          <h3 className="socials-title">Socials</h3>
          <div className="socials-grid">
            {socialNetworks.map((network) => {
              const Icon = network.icon;
              const isSelected = networks[network.name];
              const isLinked = network.linked;

              return (
                <button
                  key={network.name}
                  className={`social-button ${isSelected && isLinked ? 'selected' : ''} ${!isLinked ? 'disabled' : ''}`}
                  onClick={() => handleNetworkToggle(network.name, isLinked)}
                  style={{
                    backgroundColor: isSelected && isLinked ? network.color : '#d9d9d9'
                  }}
                >
                  <Icon
                    className="social-icon"
                    style={{
                      color: isSelected && isLinked ? 'white' : 'rgba(0,0,0,0.5)'
                    }}
                  />
                  <span
                    className="social-name"
                    style={{
                      color: isSelected && isLinked ? 'white' : 'black'
                    }}
                  >
                    {network.displayName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row - Preview and Comments */}
      <div className="compose-bottom-row">
        {/* Left - Preview */}
        <div className="compose-preview">
          <div className="preview-header-section">
            <h3 className="preview-title">Preview</h3>
            <select
              className="platform-selector"
              value={selectedPreviewPlatform}
              onChange={(e) => setSelectedPreviewPlatform(e.target.value)}
            >
              {platformPreviewOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="preview-container">
            <div className="phone-mockup">
              <div className="phone-notch">
                <div className="notch-line" />
                <div className="notch-line" />
              </div>

              <div className="phone-content">
                {renderPlatformPreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Comments */}
        <div className="compose-comments">
          <h3 className="comments-title">Comment</h3>
          <div className="comments-container">
            <div className="comments-empty">
              <p>No comments yet.</p>
            </div>
            <div className="comment-input-wrapper">
              <textarea
                className="comment-input"
                placeholder="Type a comment..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule Post</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DatePicker
              selected={scheduledDate}
              onChange={handleSchedule}
              showTimeSelect
              dateFormat="Pp"
              minDate={new Date()}
              inline
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Scheduled Date Display */}
      {scheduledDate && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#6465f1',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          Scheduled for: {scheduledDate.toLocaleString()}
        </div>
      )}
    </div>
  );
};
