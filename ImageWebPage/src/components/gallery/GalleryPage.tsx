"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ImageDto, ImageGroupDto} from "@/types";
import {useImages} from "@/hooks/useImages";
import {useFavourite} from "@/hooks/useFavourite";
import {useTags} from "@/hooks/useTags";
import {deleteImage, deleteImages, uploadImage, importSeedImages} from "@/lib/api";
import {useAuth} from "@/context/AuthContext";
import {useToast} from "@/components/ui/Toast";
import GalleryHeader from "./GalleryHeader";
import DateGroup from "./DateGroup";
import SelectionBar from "./SelectionBar";
import UploadProgressDialog from "./UploadProgressDialog";
import Lightbox from "@/components/lightbox/Lightbox";
import TagDialog from "@/components/tags/TagDialog";
import DeleteDialog from "@/components/lightbox/DeleteDialog";
import LoginPromptDialog from "@/components/ui/LoginPromptDialog";
import SeedImportDialog from "@/components/ui/SeedImportDialog";

function SelectionHeader({count, total, onCancel, onSelectAll}: {
    count: number;
    total: number;
    onCancel: () => void;
    onSelectAll: () => void;
}) {
    return (
        <div
            className="sticky top-0 z-30 bg-black flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <button onClick={onSelectAll} className="text-base font-medium text-blue-400">
                {count === total && total > 0 ? "Deselect All" : "Select All"}
            </button>
            <span className="text-base font-semibold">
        {count === 0 ? "Select items" : `${count} selected`}
      </span>
            <button onClick={onCancel} className="text-base font-medium text-gray-300">
                Cancel
            </button>
        </div>
    );
}

// Fake ImageDto used as the target when adding tags in bulk selection mode.
// The id (-1) is a sentinel that GalleryPage intercepts — it never reaches the API.
function bulkTagTarget(selectedCount: number): ImageDto {
    return {
        id: -1,
        filename: `${selectedCount} photo${selectedCount !== 1 ? "s" : ""}`,
        takenAt: "",
        favourite: false,
        tags: [],
        thumbnailUrl: "",
        fullUrl: "",
    };
}

export default function GalleryPage() {
    const {isOwner, user} = useAuth();
    const {groups, setGroups, loading, error, reload} = useImages();
    const {showToast} = useToast();

    // Refetch images when auth state changes (login/logout)
    useEffect(() => {
        reload();
    }, [isOwner, reload]);
    const {toggle: toggleFavouriteRaw} = useFavourite(setGroups);
    const {add: addTag, remove: removeTag, suggestions, loadSuggestions} = useTags(setGroups);

    // Guests cannot toggle favourites — no-op prevents an unauthenticated 401
    const toggleFavourite = useCallback(async (id: number): Promise<void> => {
        if (!isOwner) return;
        await toggleFavouriteRaw(id);
    }, [isOwner, toggleFavouriteRaw]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [favouritesOnly, setFavouritesOnly] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<ImageDto | null>(null);
    const [bulkTagOpen, setBulkTagOpen] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [showBulkDeleteLoginPrompt, setShowBulkDeleteLoginPrompt] = useState(false);
    const [seedImportOpen, setSeedImportOpen] = useState(false);
    const [seedImportLoading, setSeedImportLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
        current: number;
        total: number;
        skipped: number;
    } | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const dragCounter = useRef(0);

    // Show seed import prompt on first login with empty gallery (local profile only)
    // Use a per-user session key so the prompt shows for each new account
    useEffect(() => {
        const seedImportEnabled = process.env.NEXT_PUBLIC_SEED_IMPORT_ENABLED === "true";
        if (!seedImportEnabled || !isOwner || !user?.email) return;
        const sessionKey = `seedImportAsked_${user.email}`;
        const asked = sessionStorage.getItem(sessionKey);
        const shouldShow = groups.length === 0 && !loading && !asked;
        if (shouldShow) {
            setSeedImportOpen(true);
            sessionStorage.setItem(sessionKey, "true");
        }
    }, [isOwner, user?.email, groups.length, loading]);

    const filteredGroups = useMemo(
        () =>
            groups
                .map((group) => ({
                    ...group,
                    images: group.images.filter((img) => {
                        if (favouritesOnly && !img.favourite) return false;
                        return true;
                    }),
                }))
                .filter((group) => group.images.length > 0),
        [groups, favouritesOnly],
    );

    const allFilteredImages = useMemo(
        () => filteredGroups.flatMap((g) => g.images),
        [filteredGroups],
    );

    const totalCount = allFilteredImages.length;

    const handleImagePress = useCallback(
        (image: ImageDto) => {
            if (selectionMode) {
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(image.id)) next.delete(image.id);
                    else next.add(image.id);
                    return next;
                });
            } else {
                setLightboxImage(image);
            }
        },
        [selectionMode],
    );

    const handleSelectGroup = useCallback(
        (group: ImageGroupDto) => {
            const allSelected = group.images.every((img) => selectedIds.has(img.id));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (allSelected) {
                    group.images.forEach((img) => next.delete(img.id));
                } else {
                    group.images.forEach((img) => next.add(img.id));
                }
                return next;
            });
        },
        [selectedIds],
    );

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === totalCount && totalCount > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allFilteredImages.map((img) => img.id)));
        }
    }, [selectedIds.size, totalCount, allFilteredImages]);

    const exitSelection = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const handleBulkFavourite = useCallback(async () => {
        for (const id of selectedIds) {
            const image = allFilteredImages.find((img) => img.id === id);
            if (image && !image.favourite) await toggleFavourite(id);
        }
        exitSelection();
    }, [selectedIds, allFilteredImages, toggleFavourite, exitSelection]);

    const handleBulkAddTag = useCallback(
        async (_imageId: number, tag: string) => {
            for (const id of selectedIds) {
                await addTag(id, tag);
            }
        },
        [selectedIds, addTag],
    );

    const handleBulkDelete = useCallback(async () => {
        const ids = Array.from(selectedIds);
        await deleteImages(ids);
        const deletedSet = new Set(ids);
        setGroups((prev) =>
            prev
                .map((g) => ({...g, images: g.images.filter((img) => !deletedSet.has(img.id))}))
                .filter((g) => g.images.length > 0),
        );
        exitSelection();
    }, [selectedIds, exitSelection]);

    const handleDeleteImage = useCallback(async (id: number) => {
        await deleteImage(id);
        setGroups((prev) =>
            prev
                .map((g) => ({...g, images: g.images.filter((img) => img.id !== id)}))
                .filter((g) => g.images.length > 0),
        );
    }, []);

    const handleUpload = useCallback(
        async (files: File[]) => {
            if (files.length === 0) return;
            let skipped = 0;
            setUploadProgress({current: 0, total: files.length, skipped: 0});
            try {
                for (let i = 0; i < files.length; i++) {
                    try {
                        await uploadImage(files[i]);
                    } catch (err) {
                        // Only count as "already in gallery" if it's an actual duplicate error
                        // Other errors (network, validation) are logged but still counted as failures
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        if (errorMsg.includes("already exists")) {
                            console.warn(`Duplicate detected: ${files[i].name} - ${errorMsg}`);
                        } else {
                            console.error(`Upload failed for ${files[i].name}:`, err);
                        }
                        skipped++;
                    }
                    setUploadProgress({current: i + 1, total: files.length, skipped});
                }
                await reload();
            } finally {
                setUploadProgress(null);
            }
        },
        [reload],
    );

    const handleSeedImportAccept = useCallback(async () => {
        setSeedImportLoading(true);
        try {
            await importSeedImages();
            await reload();
            setSeedImportOpen(false);
            showToast("Sample images imported!");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Import failed";
            showToast(msg);
            console.error("Seed import failed:", e);
        } finally {
            setSeedImportLoading(false);
        }
    }, [reload, showToast]);

    const handleSeedImportDecline = useCallback(() => {
        setSeedImportOpen(false);
    }, []);

    useEffect(() => {
        const onDragEnter = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes("Files")) return;
            e.preventDefault();
            dragCounter.current++;
            setDragOver(true);
        };
        const onDragLeave = () => {
            dragCounter.current--;
            if (dragCounter.current <= 0) {
                dragCounter.current = 0;
                setDragOver(false);
            }
        };
        const onDragOver = (e: DragEvent) => e.preventDefault();
        const onDrop = (e: DragEvent) => {
            e.preventDefault();
            dragCounter.current = 0;
            setDragOver(false);
            const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
                f.type.startsWith("image/") || f.type.startsWith("video/"),
            );
            if (files.length > 0) handleUpload(files);
        };

        window.addEventListener("dragenter", onDragEnter);
        window.addEventListener("dragleave", onDragLeave);
        window.addEventListener("dragover", onDragOver);
        window.addEventListener("drop", onDrop);
        return () => {
            window.removeEventListener("dragenter", onDragEnter);
            window.removeEventListener("dragleave", onDragLeave);
            window.removeEventListener("dragover", onDragOver);
            window.removeEventListener("drop", onDrop);
        };
    }, [handleUpload]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-400 text-sm">Loading…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={reload} className="text-blue-400 text-sm">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <main className="pb-20">
            {selectionMode ? (
                <SelectionHeader
                    count={selectedIds.size}
                    total={totalCount}
                    onCancel={exitSelection}
                    onSelectAll={handleSelectAll}
                />
            ) : (
                <GalleryHeader
                    onSelectMode={() => { if (isOwner) setSelectionMode(true); }}
                    onFavouritesToggle={() => setFavouritesOnly((v) => !v)}
                    favouritesOnly={favouritesOnly}
                    onUpload={handleUpload}
                    uploading={uploadProgress !== null}
                />
            )}

            {filteredGroups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-8 gap-6">
                    <div className="w-52 h-52 rounded-3xl bg-neutral-950 p-5 flex items-center justify-center">
                        <img src="/noImages.svg" alt="" aria-hidden="true" className="w-full h-full"/>
                    </div>
                    <div className="text-center">
                        <p className="text-white text-2xl font-bold tracking-tight">Wow, So Empty!</p>
                        <p className="text-gray-400 text-sm mt-1">Tap the upload button to add your first photo</p>
                    </div>
                </div>
            )}

            {filteredGroups.map((group) => (
                <DateGroup
                    key={group.date}
                    group={group}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onImagePress={handleImagePress}
                    onSelectGroup={handleSelectGroup}
                    onToggleFavourite={toggleFavourite}
                />
            ))}

            {selectionMode && (
                <SelectionBar
                    count={selectedIds.size}
                    onFavourite={handleBulkFavourite}
                    onAddTag={() => setBulkTagOpen(true)}
                    onDelete={() => {
                        if (!isOwner) {
                            setShowBulkDeleteLoginPrompt(true);
                        } else {
                            setShowBulkDeleteDialog(true);
                        }
                    }}
                />
            )}


            {/* Bulk tag dialog (selection mode) */}
            <TagDialog
                image={bulkTagOpen && selectedIds.size > 0 ? bulkTagTarget(selectedIds.size) : null}
                open={bulkTagOpen}
                onClose={() => {
                    setBulkTagOpen(false);
                    exitSelection();
                }}
                onAddTag={handleBulkAddTag}
                onRemoveTag={async () => {
                }}
                suggestions={suggestions}
                onLoadSuggestions={loadSuggestions}
            />

            <DeleteDialog
                open={showBulkDeleteDialog}
                count={selectedIds.size}
                onConfirm={handleBulkDelete}
                onClose={() => setShowBulkDeleteDialog(false)}
            />

            <LoginPromptDialog
                open={showBulkDeleteLoginPrompt}
                action="delete these images"
                onClose={() => setShowBulkDeleteLoginPrompt(false)}
            />

            {uploadProgress !== null && (
                <UploadProgressDialog
                    current={uploadProgress.current}
                    total={uploadProgress.total}
                    skipped={uploadProgress.skipped}
                />
            )}

            {dragOver && (
                <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center pointer-events-none">
                    <div
                        className="border-2 border-dashed border-blue-400 rounded-3xl px-16 py-14 flex flex-col items-center gap-3 text-center">
                        <p className="text-white text-2xl font-bold">Drop to upload</p>
                        <p className="text-gray-400 text-sm">Release to add images to your gallery</p>
                    </div>
                </div>
            )}

            <SeedImportDialog
                open={seedImportOpen}
                onDecline={handleSeedImportDecline}
                onAccept={handleSeedImportAccept}
                loading={seedImportLoading}
            />

            <Lightbox
                image={lightboxImage}
                allImages={allFilteredImages}
                onClose={() => setLightboxImage(null)}
                onToggleFavourite={toggleFavourite}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onDelete={handleDeleteImage}
                tagSuggestions={suggestions}
                onLoadTagSuggestions={loadSuggestions}
            />
        </main>
    );
}
