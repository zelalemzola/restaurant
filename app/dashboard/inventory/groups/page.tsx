"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  useGetProductGroupsQuery,
  useCreateProductGroupMutation,
  useUpdateProductGroupMutation,
  useDeleteProductGroupMutation,
} from "@/lib/store/api";
import { ProductGroup } from "@/types";

interface ProductGroupFormData {
  name: string;
  description: string;
}

export default function ProductGroupsPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [formData, setFormData] = useState<ProductGroupFormData>({
    name: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<ProductGroupFormData>>({});

  // RTK Query hooks
  const { data: productGroupsResponse, isLoading, error } = useGetProductGroupsQuery();
  const [createProductGroup, { isLoading: isCreating }] = useCreateProductGroupMutation();
  const [updateProductGroup, { isLoading: isUpdating }] = useUpdateProductGroupMutation();
  const [deleteProductGroup, { isLoading: isDeleting }] = useDeleteProductGroupMutation();

  const productGroups = productGroupsResponse?.success ? productGroupsResponse.data : [];

  const validateForm = (data: ProductGroupFormData): boolean => {
    const errors: Partial<ProductGroupFormData> = {};

    if (!data.name.trim()) {
      errors.name = "Group name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Group name must be at least 2 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setFormErrors({});
    setEditingGroup(null);
  };

  const handleCreate = async () => {
    if (!validateForm(formData)) return;

    try {
      const result = await createProductGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      }).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: "Product group created successfully",
        });
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to create product group",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (group: ProductGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingGroup || !validateForm(formData)) return;

    try {
      const result = await updateProductGroup({
        id: editingGroup._id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        },
      }).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: "Product group updated successfully",
        });
        setIsEditDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update product group",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (group: ProductGroup) => {
    try {
      const result = await deleteProductGroup(group._id).unwrap();

      if (result.success) {
        toast({
          title: "Success",
          description: "Product group deleted successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to delete product group",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading product groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading product groups</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Groups</h1>
            <p className="text-muted-foreground mt-2">
              Organize your products into categories for better management
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Product Group</DialogTitle>
                <DialogDescription>
                  Add a new product group to organize your inventory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Beverages, Food Items, Raw Materials"
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this group"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {productGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Product Groups</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first product group to organize your inventory
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Group
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productGroups.map((group) => (
              <Card key={group._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription className="mt-2">
                          {group.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{group.name}"? This action cannot be undone.
                              You can only delete groups that have no products associated with them.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(group)}
                              disabled={isDeleting}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(group.createdAt).toLocaleDateString()}
                  </div>
                  {group.updatedAt !== group.createdAt && (
                    <div className="text-sm text-muted-foreground">
                      Updated: {new Date(group.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product Group</DialogTitle>
              <DialogDescription>
                Update the product group information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Group Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Beverages, Food Items, Raw Materials"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this group"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Group"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}