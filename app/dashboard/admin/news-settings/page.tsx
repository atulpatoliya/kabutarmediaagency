"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react';

type CategoryRow = {
  id?: string;
  name: string;
  parentId: string | null;
  status: boolean;
};

type CategoriesResponse = {
  categories?: Array<{ id: string; name: string; parent_id?: string | null; status?: boolean }>;
  hierarchyEnabled?: boolean;
  migrationRequired?: boolean;
  migrationSql?: string;
  warning?: string;
  error?: string;
};

export default function AdminNewsSettingsPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hierarchyEnabled, setHierarchyEnabled] = useState(true);
  const [migrationWarning, setMigrationWarning] = useState('');
  const [migrationSql, setMigrationSql] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/admin/categories', { cache: 'no-store' });
        const result = await response.json() as CategoriesResponse;

        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load categories.');
        }

        setCategories((result.categories || []).map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parent_id || null,
          status: category.status !== false,
        })));
        setHierarchyEnabled(result.hierarchyEnabled !== false);
        setMigrationWarning(result.warning || '');
        setMigrationSql(result.migrationSql || '');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges || isSaving) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChanges || isSaving) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const shouldLeave = window.confirm('You have unsaved category changes. Leave this page without saving?');
      if (!shouldLeave) {
        event.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentNavigation, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentNavigation, true);
    };
  }, [hasUnsavedChanges, isSaving]);

  const markDirty = () => {
    setHasUnsavedChanges(true);
    setSuccessMessage('');
  };

  const updateCategoryName = (index: number, value: string) => {
    markDirty();
    setCategories((previous) => previous.map((category, currentIndex) => (
      currentIndex === index ? { ...category, name: value } : category
    )));
  };

  const updateCategoryStatus = (index: number, value: boolean) => {
    markDirty();
    setCategories((previous) => previous.map((category, currentIndex) => (
      currentIndex === index ? { ...category, status: value } : category
    )));
  };

  const getChildrenIds = (rootId: string) => {
    const descendants = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      for (const row of categories) {
        if (row.id && row.parentId === current && !descendants.has(row.id)) {
          descendants.add(row.id);
          queue.push(row.id);
        }
      }
    }
    return descendants;
  };

  const hasChildren = (categoryId?: string) => {
    if (!categoryId) return false;
    return categories.some((row) => row.parentId === categoryId);
  };

  const toggleCollapsed = (categoryId?: string) => {
    if (!categoryId) return;

    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const isHiddenByCollapsedParent = (category: CategoryRow) => {
    if (!category.parentId) return false;

    const byId = new Map(categories.filter((row) => row.id).map((row) => [row.id as string, row]));
    let current: string | null = category.parentId;
    let guard = 0;

    while (current && guard < 20) {
      if (collapsedIds.has(current)) {
        return true;
      }
      const parent = byId.get(current);
      current = parent?.parentId || null;
      guard += 1;
    }

    return false;
  };

  const getDepth = (category: CategoryRow) => {
    if (!category.parentId) return 0;

    const byId = new Map(categories.filter((row) => row.id).map((row) => [row.id as string, row]));
    let depth = 0;
    let current: string | null = category.parentId;
    let guard = 0;
    while (current && guard < 10) {
      const parent = byId.get(current);
      if (!parent) break;
      depth += 1;
      current = parent.parentId;
      guard += 1;
    }
    return Math.min(depth, 4);
  };

  const depthClass = (depth: number) => {
    if (depth >= 4) return 'ml-16';
    if (depth === 3) return 'ml-12';
    if (depth === 2) return 'ml-8';
    if (depth === 1) return 'ml-4';
    return 'ml-0';
  };

  const getPathLabel = (category: CategoryRow) => {
    const byId = new Map(categories.filter((row) => row.id).map((row) => [row.id as string, row]));
    const parts: string[] = [category.name.trim() || '(Unnamed)'];
    let current: string | null = category.parentId;
    let guard = 0;
    while (current && guard < 10) {
      const parent = byId.get(current);
      if (!parent) break;
      parts.unshift(parent.name.trim() || '(Unnamed)');
      current = parent.parentId;
      guard += 1;
    }
    return parts.join(' > ');
  };

  const updateCategoryParent = (index: number, parentId: string) => {
    if (!hierarchyEnabled) return;
    markDirty();
    const nextParent = parentId === '' ? null : parentId;

    const currentCategory = categories[index];
    const selfId = currentCategory?.id;
    const descendants = selfId ? getChildrenIds(selfId) : new Set<string>();

    if (nextParent && selfId && (nextParent === selfId || descendants.has(nextParent))) {
      setErrorMessage('Invalid parent selection. Parent cycle is not allowed.');
      return;
    }

    setCategories((previous) => previous.map((category, currentIndex) => {
      if (currentIndex !== index) return category;
      if (nextParent && nextParent === category.id) return category;
      return { ...category, parentId: nextParent };
    }));
  };

  const addCategory = (parentId: string | null = null) => {
    markDirty();
    setCategories((previous) => [...previous, { name: '', parentId: hierarchyEnabled ? parentId : null, status: true }]);
  };

  const removeCategory = (index: number) => {
    markDirty();
    setCategories((previous) => {
      const removedCategory = previous[index];
      const filtered = previous.filter((_, currentIndex) => currentIndex !== index);
      if (!removedCategory?.id) {
        return filtered;
      }
      return filtered.map((category) => (
        category.parentId === removedCategory.id ? { ...category, parentId: null } : category
      ));
    });
    setPendingDeleteIndex(null);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    markDirty();
    setCategories((previous) => {
      const updated = [...previous];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setDragIndex(null);
  };

  const visibleIndexes = categories
    .map((_, index) => index)
    .filter((index) => !isHiddenByCollapsedParent(categories[index]));

  const emptyNameIndexes = categories
    .map((category, index) => (category.name.trim().length === 0 ? index : -1))
    .filter((index) => index >= 0);

  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (categories.length === 0) {
      setErrorMessage('At least one category is required.');
      return;
    }

    if (emptyNameIndexes.length > 0) {
      setErrorMessage('Please fill all category names before saving.');
      return;
    }

    const payload = categories.map((category) => ({
      id: category.id,
      name: category.name.trim(),
      parentId: category.parentId,
      status: category.status,
    }));

    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: payload }),
      });

      const result = await response.json() as CategoriesResponse;
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save category settings.');
      }

      setCategories((result.categories || []).map((category) => ({
        id: category.id,
        name: category.name,
        parentId: category.parent_id || null,
        status: category.status !== false,
      })));
      setHierarchyEnabled(result.hierarchyEnabled !== false);
      setMigrationWarning(result.warning || '');
      setMigrationSql(result.migrationSql || '');
      setSuccessMessage('Category settings updated successfully.');
      setHasUnsavedChanges(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save category settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">News Settings</h1>
        <p className="mt-1 text-gray-600">Add categories and subcategories, drag to reorder, and manage full hierarchy for reporter and buyer dropdowns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>Drag rows to reorder sequence. Use parent selector to build hierarchy (International &gt; Country &gt; State &gt; Local).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading categories...
            </div>
          ) : (
            <>
              {migrationWarning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p>{migrationWarning}</p>
                  {migrationSql && (
                    <pre className="mt-2 overflow-x-auto rounded bg-white/70 p-2 text-xs text-amber-900">{migrationSql}</pre>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCollapsedIds(new Set(categories.filter((row) => row.id && hasChildren(row.id)).map((row) => row.id as string)))}
                >
                  Collapse All
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setCollapsedIds(new Set())}>
                  Expand All
                </Button>
              </div>

              {visibleIndexes.map((index) => {
                const category = categories[index];
                const isCollapsed = category.id ? collapsedIds.has(category.id) : false;
                const childrenAvailable = hasChildren(category.id);

                return (
                <div
                  key={category.id || `new-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={`${depthClass(getDepth(category))} rounded-lg border bg-white p-3 transition-all ${dragIndex === index ? 'border-primary/60 shadow-sm' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      title={childrenAvailable ? (isCollapsed ? 'Expand' : 'Collapse') : 'No children'}
                      className="rounded-md border border-gray-200 bg-white p-1 text-gray-500 disabled:opacity-40"
                      disabled={!childrenAvailable}
                      onClick={() => toggleCollapsed(category.id)}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      className="cursor-grab rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-500 hover:bg-gray-100"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex w-8 justify-center text-sm font-semibold text-gray-500">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={category.name}
                        onChange={(event) => updateCategoryName(index, event.target.value)}
                        placeholder="Enter category name"
                        className={category.name.trim().length === 0 ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                      />
                      {category.name.trim().length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-gray-500">{getPathLabel(category)}</p>
                      )}
                      {category.name.trim().length === 0 && (
                        <p className="mt-1 text-xs text-red-500">Category name is required.</p>
                      )}
                    </div>
                    <select
                      value={category.parentId || ''}
                      onChange={(event) => updateCategoryParent(index, event.target.value)}
                      className="h-9 min-w-45 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                      title="Parent category"
                      disabled={!hierarchyEnabled}
                    >
                      <option value="">No Parent (Top Level)</option>
                      {categories
                        .filter((row) => {
                          if (!row.id || row.id === category.id) return false;
                          if (!category.id) return true;
                          const descendants = getChildrenIds(category.id);
                          return !descendants.has(row.id);
                        })
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {getPathLabel(row)}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant={category.status ? 'secondary' : 'outline'}
                      size="sm"
                      className={category.status ? 'text-green-700' : 'text-gray-600'}
                      onClick={() => updateCategoryStatus(index, !category.status)}
                      title="Toggle active status"
                    >
                      {category.status ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addCategory(category.id || null)}
                      title="Add subcategory"
                      disabled={!hierarchyEnabled}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => setPendingDeleteIndex(index)} title="Remove category">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                );
              })}

              {pendingDeleteIndex !== null && categories[pendingDeleteIndex] && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-900">
                    Remove category "{categories[pendingDeleteIndex].name || `#${pendingDeleteIndex + 1}`}"?
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    This will be removed after you confirm below and save changes.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPendingDeleteIndex(null)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeCategory(pendingDeleteIndex)}>
                      Confirm Remove
                    </Button>
                  </div>
                </div>
              )}

              <Button type="button" variant="outline" onClick={() => addCategory()} className="w-full gap-2 border-dashed">
                <Plus className="h-4 w-4" />
                Add Top-Level Category
              </Button>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMessage}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="button" onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>

              {hasUnsavedChanges && !isSaving && (
                <p className="text-xs text-amber-600">You have unsaved changes. Click Save Changes before leaving this page.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}