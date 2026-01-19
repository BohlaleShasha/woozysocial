import React, { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useUserBrandProfile } from "../hooks/useQueries";
import { supabase } from "../utils/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import "./BrandProfileContent.css";

export const BrandProfileContent = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("Professional");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyTopics, setKeyTopics] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [samplePosts, setSamplePosts] = useState("");

  // Use React Query for brand profile (cached!)
  const { data: profileData, isLoading } = useUserBrandProfile(user?.id);

  // Populate form when data loads
  useEffect(() => {
    if (profileData) {
      setBrandName(profileData.brand_name || "");
      setWebsiteUrl(profileData.website_url || "");
      setBrandDescription(profileData.brand_description || "");
      setToneOfVoice(profileData.tone_of_voice || "Professional");
      setTargetAudience(profileData.target_audience || "");
      setKeyTopics(profileData.key_topics || "");
      setBrandValues(profileData.brand_values || "");
      setSamplePosts(profileData.sample_posts || "");
    }
  }, [profileData]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save",
        status: "error",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        brand_name: brandName,
        website_url: websiteUrl,
        brand_description: brandDescription,
        tone_of_voice: toneOfVoice,
        target_audience: targetAudience,
        key_topics: keyTopics,
        brand_values: brandValues,
        sample_posts: samplePosts,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('brand_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      // Invalidate cache so next load is fresh
      queryClient.invalidateQueries({ queryKey: ["userBrandProfile", user.id] });

      toast({
        title: "Brand profile saved!",
        description: "Your brand profile has been updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error("Error saving brand profile:", error);
      toast({
        title: "Error saving brand profile",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="brand-profile-container">
        <div className="brand-profile-header">
          <h1 className="page-title">Brand Profile</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-profile-container">
      <div className="brand-profile-header">
        <h1 className="page-title">Brand Profile</h1>
        <p className="page-subtitle">Define your brand to help AI generate better content</p>
      </div>

      <div className="brand-profile-content">
        <div className="brand-section">
          <h2 className="section-title">Brand Information</h2>
          <p className="section-subtitle">Define your brand identity</p>

          <div className="form-group">
            <label htmlFor="brandName">Brand Name</label>
            <input
              type="text"
              id="brandName"
              placeholder="Your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="websiteUrl">Website URL</label>
            <input
              type="url"
              id="websiteUrl"
              placeholder="https://yourbrand.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              AI will analyze your website to better understand your brand
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="brandDescription">Brand Description</label>
            <textarea
              id="brandDescription"
              placeholder="Describe what your brand does, its mission, and unique value..."
              rows="4"
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="toneOfVoice">Tone of Voice</label>
            <select
              id="toneOfVoice"
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
            >
              <option value="Professional">Professional</option>
              <option value="Casual">Casual</option>
              <option value="Friendly">Friendly</option>
              <option value="Formal">Formal</option>
              <option value="Humorous">Humorous</option>
              <option value="Inspirational">Inspirational</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="targetAudience">Target Audience</label>
            <textarea
              id="targetAudience"
              placeholder="Describe your target audience (age, interests, demographics, pain points)..."
              rows="3"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="keyTopics">Key Topics & Themes</label>
            <textarea
              id="keyTopics"
              placeholder="What topics does your brand talk about? (e.g., technology, sustainability, health, fashion)"
              rows="3"
              value={keyTopics}
              onChange={(e) => setKeyTopics(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="brandValues">Brand Values</label>
            <textarea
              id="brandValues"
              placeholder="What values does your brand stand for? (e.g., innovation, transparency, inclusivity)"
              rows="3"
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="samplePosts">Sample Posts (Optional)</label>
            <textarea
              id="samplePosts"
              placeholder="Paste 2-3 example posts that represent your brand voice well..."
              rows="6"
              value={samplePosts}
              onChange={(e) => setSamplePosts(e.target.value)}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              These help AI understand your writing style
            </small>
          </div>

          <button
            className="save-button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Brand Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
