// Reusable asset picker used everywhere a content.*.imageUrl/audioUrl or a lesson resource
// `url` needs setting. Two tabs: Upload (drag-drop/file-select -> POST /dashboard/assets/upload)
// and Browse (GET /dashboard/assets?type=&search= -> click to select). Values are always GCS
// *paths* (e.g. "question-media/images/172xxxx-cat.png"), not full URLs — matches how the rest
// of the app already stores IDraggable.imageUrl/audioUrl etc. The caller builds display URLs
// via ASSETS.GCS_BASE, same as everywhere else.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Upload, Search, FileText, Image as ImageIcon, Music, Video, Loader2, X } from 'lucide-react';
import api from '../../../lib/axios';
import { ASSETS } from '@my-backpack/shared';

export type StudioAssetType = 'images' | 'audio' | 'video' | 'documents';

interface AssetSummary {
  name: string;
  path: string;
  url: string;
  size: number;
  updatedAt: string;
}

interface AssetPickerProps {
  assetType: StudioAssetType;
  value: string | undefined;
  onChange: (path: string) => void;
  label?: string;
}

const ACCEPT: Record<StudioAssetType, string> = {
  images: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  documents: '.pdf,.doc,.docx,.txt',
};

const TYPE_ICON: Record<StudioAssetType, typeof ImageIcon> = {
  images: ImageIcon,
  audio: Music,
  video: Video,
  documents: FileText,
};

function assetUrl(path: string): string {
  return `${ASSETS.GCS_BASE}/${path}`;
}

function filenameFromPath(path: string): string {
  return path.split('/').pop() ?? path;
}

export default function AssetPicker({ assetType, value, onChange, label }: AssetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'browse'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [search, setSearch] = useState('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = TYPE_ICON[assetType];

  const loadAssets = useCallback(
    async (searchTerm: string) => {
      setIsBrowsing(true);
      try {
        const params = new URLSearchParams({ type: assetType });
        if (searchTerm) params.set('search', searchTerm);
        const res = await api.get(`/dashboard/assets?${params.toString()}`);
        setAssets(res.data.data as AssetSummary[]);
      } catch {
        setAssets([]);
      } finally {
        setIsBrowsing(false);
      }
    },
    [assetType]
  );

  useEffect(() => {
    if (isOpen && tab === 'browse') void loadAssets(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab]);

  const openPicker = () => {
    setUploadError(null);
    setTab(value ? 'browse' : 'upload');
    setIsOpen(true);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', assetType);
      const res = await api.post('/dashboard/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { path } = res.data.data as { path: string; url: string };
      onChange(path);
      setIsOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setUploadError(e.response?.data?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}

      {/* Current selection */}
      <div className="flex items-center gap-3 bg-white/40 border border-white/50 rounded-xl px-3 py-2">
        {value ? (
          <>
            {assetType === 'images' ? (
              <img src={assetUrl(value)} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
            ) : assetType === 'audio' ? (
              <audio controls src={assetUrl(value)} className="h-8 max-w-[180px]" />
            ) : assetType === 'video' ? (
              <video controls src={assetUrl(value)} className="h-16 max-w-[160px] rounded-lg" />
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-gray-700 bg-white/60 px-2 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
                {filenameFromPath(value)}
              </span>
            )}
            <span className="flex-1 text-xs text-gray-500 truncate">{filenameFromPath(value)}</span>
          </>
        ) : (
          <span className="flex-1 text-sm text-gray-400 flex items-center gap-1.5">
            <Icon className="w-4 h-4" /> No {assetType.slice(0, -1)} selected
          </span>
        )}
        <button
          type="button"
          onClick={openPicker}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 transition-colors"
        >
          {value ? 'Change' : 'Select'}
        </button>
      </div>

      {/* Picker panel */}
      {isOpen && (
        <div className="mt-2 bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl p-3 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-white/50 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  tab === 'upload' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setTab('browse')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  tab === 'browse' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
                }`}
              >
                Browse
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {tab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
                isDragging ? 'border-violet-400 bg-violet-50/60' : 'border-gray-300/60 hover:border-violet-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT[assetType]}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
              <p className="text-sm text-gray-500">
                {isUploading ? 'Uploading…' : 'Drag & drop, or click to choose a file'}
              </p>
              {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 bg-white/60 border border-white/60 rounded-lg px-2.5 py-1.5 mb-2">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadAssets(search);
                  }}
                  placeholder="Search assets…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              {isBrowsing ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              ) : assets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No assets found.</p>
              ) : assetType === 'images' ? (
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {assets.map((asset) => (
                    <button
                      key={asset.path}
                      type="button"
                      onClick={() => {
                        onChange(asset.path);
                        setIsOpen(false);
                      }}
                      title={asset.name}
                      className="aspect-square rounded-lg overflow-hidden border border-white/60 hover:ring-2 hover:ring-violet-400 transition-all"
                    >
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {assets.map((asset) => (
                    <div
                      key={asset.path}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/60 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onChange(asset.path);
                          setIsOpen(false);
                        }}
                        className="flex-1 flex items-center gap-2 text-left text-sm text-gray-700 truncate"
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{asset.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPath(previewPath === asset.path ? null : asset.path)}
                        className="text-xs text-violet-600 flex-shrink-0"
                      >
                        {previewPath === asset.path ? 'Hide' : 'Preview'}
                      </button>
                      {previewPath === asset.path &&
                        (assetType === 'audio' ? (
                          <audio controls autoPlay src={asset.url} className="h-7 max-w-[140px]" />
                        ) : (
                          <video controls autoPlay src={asset.url} className="h-16 max-w-[140px] rounded" />
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
