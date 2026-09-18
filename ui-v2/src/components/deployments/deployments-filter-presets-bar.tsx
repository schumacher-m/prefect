import type { ColumnFiltersState } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import type { components } from "@/api/prefect";
import { SaveFilterDialog } from "@/components/runs/save-filter-dialog";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/utils";
import {
	areDeploymentFiltersEqual,
	type DeploymentSavedFilterValues,
	type SavedDeploymentFilter,
	useDeploymentsSavedFilters,
} from "./use-deployments-saved-filters";

export type DeploymentsFilterPresetsBarProps = {
	columnFilters: ColumnFiltersState;
	sort: components["schemas"]["DeploymentSort"];
	onColumnFiltersChange: (columnFilters: ColumnFiltersState) => void;
	onSortChange: (sort: components["schemas"]["DeploymentSort"]) => void;
	onClearFilters?: () => void;
	className?: string;
};

export const DeploymentsFilterPresetsBar = ({
	columnFilters,
	sort,
	onColumnFiltersChange,
	onSortChange,
	onClearFilters,
	className,
}: DeploymentsFilterPresetsBarProps) => {
	const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
	const [filterToDelete, setFilterToDelete] =
		useState<SavedDeploymentFilter | null>(null);
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [draftName, setDraftName] = useState("");
	const ignoreRenameBlurRef = useRef(false);
	const renameInputRef = useRef<HTMLInputElement>(null);

	const {
		savedFilters,
		saveFilter,
		updateFilter,
		deleteFilter,
		findMatchingFilter,
	} = useDeploymentsSavedFilters();

	const flowOrDeploymentName = (columnFilters.find(
		(filter) => filter.id === "flowOrDeploymentName",
	)?.value ?? "") as string;
	const tags = (columnFilters.find((filter) => filter.id === "tags")?.value ??
		[]) as string[];

	const currentFilterValues: DeploymentSavedFilterValues = {
		flowOrDeploymentName: flowOrDeploymentName || undefined,
		tags: tags.length ? tags : undefined,
		sort,
	};

	const matchingFilter = findMatchingFilter(currentFilterValues);
	const hasActiveFilters =
		Boolean(flowOrDeploymentName.trim()) || tags.length > 0;
	const isAllActive = !hasActiveFilters;

	useEffect(() => {
		if (matchingFilter) {
			setSelectedPresetId(matchingFilter.id);
		}
	}, [matchingFilter]);

	useEffect(() => {
		if (!renamingId) {
			return;
		}
		renameInputRef.current?.focus();
		renameInputRef.current?.select();
	}, [renamingId]);

	const selectedPreset = hasActiveFilters
		? savedFilters.find((preset) => preset.id === selectedPresetId)
		: undefined;
	const isDirty = Boolean(
		selectedPreset &&
			!areDeploymentFiltersEqual(selectedPreset.filters, currentFilterValues),
	);

	const handleSelectAll = () => {
		setSelectedPresetId(null);
		if (onClearFilters) {
			onClearFilters();
		} else {
			onColumnFiltersChange([]);
		}
	};

	const handleSelectPreset = (preset: SavedDeploymentFilter) => {
		setSelectedPresetId(preset.id);
		const newFilters: ColumnFiltersState = [];
		if (preset.filters.flowOrDeploymentName) {
			newFilters.push({
				id: "flowOrDeploymentName",
				value: preset.filters.flowOrDeploymentName,
			});
		}
		if (preset.filters.tags && preset.filters.tags.length > 0) {
			newFilters.push({
				id: "tags",
				value: preset.filters.tags,
			});
		}
		onColumnFiltersChange(newFilters);
		if (preset.filters.sort) {
			onSortChange(preset.filters.sort);
		}
	};

	const handleSave = (name: string) => {
		saveFilter({
			name,
			filters: currentFilterValues,
		});
	};

	const handleUpdate = () => {
		if (!selectedPreset) {
			return;
		}
		updateFilter(selectedPreset.id, { filters: currentFilterValues });
	};

	const startRename = (preset: SavedDeploymentFilter) => {
		ignoreRenameBlurRef.current = false;
		setRenamingId(preset.id);
		setDraftName(preset.name);
	};

	const cancelRename = () => {
		setRenamingId(null);
		setDraftName("");
	};

	const commitRename = (preset: SavedDeploymentFilter) => {
		if (ignoreRenameBlurRef.current) {
			ignoreRenameBlurRef.current = false;
			return;
		}
		const name = draftName.trim();
		if (name && name !== preset.name) {
			updateFilter(preset.id, { name });
		}
		cancelRename();
	};

	const hasPresets = savedFilters.length > 0;
	const showSave = hasActiveFilters && !matchingFilter;

	if (!hasPresets && !showSave) {
		return null;
	}

	return (
		<>
			<div
				className={cn(
					"flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none",
					className,
				)}
			>
				{hasPresets && (
					<>
						<span className="text-xs font-medium text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
							<Icon id="SlidersVertical" className="size-3" />
							Presets:
						</span>

						<Button
							variant={isAllActive ? "secondary" : "ghost"}
							size="sm"
							className={cn(
								"h-7 rounded-full px-3 text-xs font-medium shrink-0",
								isAllActive &&
									"bg-secondary text-secondary-foreground font-semibold shadow-xs",
							)}
							onClick={handleSelectAll}
						>
							All
						</Button>
					</>
				)}

				{savedFilters.map((preset) => {
					const isActive = selectedPreset?.id === preset.id;
					const isDirtyPreset = isActive && isDirty;
					const isRenaming = renamingId === preset.id;
					return (
						<div
							key={preset.id}
							className={cn(
								"group inline-flex items-center rounded-full border border-border text-xs transition-colors shrink-0",
								isActive
									? "bg-secondary text-secondary-foreground font-semibold border-secondary-foreground/20 shadow-xs"
									: "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							{isRenaming ? (
								<input
									ref={renameInputRef}
									aria-label={`Rename preset ${preset.name}`}
									autoComplete="off"
									className="h-7 min-w-24 rounded-full bg-transparent px-3 text-xs outline-none"
									maxLength={100}
									size={Math.max(draftName.length, 8)}
									value={draftName}
									onBlur={() => commitRename(preset)}
									onChange={(event) => setDraftName(event.target.value)}
									onClick={(event) => event.stopPropagation()}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											commitRename(preset);
										}
										if (event.key === "Escape") {
											event.preventDefault();
											ignoreRenameBlurRef.current = true;
											cancelRename();
										}
									}}
								/>
							) : (
								<>
									<button
										type="button"
										className="px-3 py-1 text-xs focus:outline-hidden cursor-pointer"
										onClick={() => handleSelectPreset(preset)}
									>
										{isDirtyPreset ? `${preset.name} •` : preset.name}
									</button>
									<button
										type="button"
										aria-label={`Rename preset ${preset.name}`}
										className="inline-flex items-center justify-center overflow-hidden w-0 p-0 opacity-0 text-muted-foreground/60 hover:text-foreground focus:outline-hidden cursor-pointer group-hover:w-4 group-hover:opacity-100 focus-visible:w-4 focus-visible:opacity-100 [@media(hover:none)]:w-4 [@media(hover:none)]:opacity-100"
										onClick={(event) => {
											event.stopPropagation();
											startRename(preset);
										}}
									>
										<Icon id="Pencil" className="size-3" />
									</button>
									<button
										type="button"
										aria-label={`Delete preset ${preset.name}`}
										className="pr-2 pl-0.5 py-1 text-muted-foreground/60 hover:text-destructive focus:outline-hidden cursor-pointer"
										onClick={(event) => {
											event.stopPropagation();
											setFilterToDelete(preset);
										}}
									>
										<Icon id="X" className="size-3" />
									</button>
								</>
							)}
						</div>
					);
				})}

				{isDirty && (
					<Button
						variant="secondary"
						size="sm"
						className="h-7 rounded-full px-2.5 text-xs font-medium shrink-0"
						onClick={handleUpdate}
					>
						Update
					</Button>
				)}

				{hasActiveFilters && !matchingFilter && (
					<Button
						variant="outline"
						size="sm"
						className="h-7 rounded-full px-2.5 text-xs font-normal border-dashed gap-1 shrink-0 text-muted-foreground hover:text-foreground"
						onClick={() => setIsSaveDialogOpen(true)}
					>
						<Icon id="Plus" className="size-3" />
						Save filter
					</Button>
				)}
			</div>

			<SaveFilterDialog
				open={isSaveDialogOpen}
				onOpenChange={setIsSaveDialogOpen}
				onSave={handleSave}
			/>

			<DeleteConfirmationDialog
				isOpen={Boolean(filterToDelete)}
				title="Delete filter preset"
				description={`Are you sure you want to delete "${filterToDelete?.name}"?`}
				onConfirm={() => {
					if (filterToDelete) {
						deleteFilter(filterToDelete.id);
						setFilterToDelete(null);
					}
				}}
				onClose={() => setFilterToDelete(null)}
			/>
		</>
	);
};
