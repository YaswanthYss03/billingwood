'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { ArrowLeft, ChefHat, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function NewRecipePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <RecipeForm />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface Item {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

function RecipeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formData, setFormData] = useState({
    finishedGoodId: '',
    name: '',
    description: '',
    yieldQuantity: '1',
    yieldUnit: 'PCS',
    preparationTime: '',
  });
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{
    ingredientId: string;
    quantity: string;
    unit: string;
    wastagePercent: string;
    notes: string;
  }>>([{
    ingredientId: '',
    quantity: '',
    unit: '',
    wastagePercent: '0',
    notes: '',
  }]);

  useEffect(() => {
    loadItems();
    loadIngredients();
  }, []);

  const loadItems = async () => {
    try {
      const response = await api.items.list();
      setItems(response.data || []);
    } catch (error: any) {
      toast.error('Failed to load items');
    }
  };

  const loadIngredients = async () => {
    try {
      const response = await api.ingredients.list();
      setIngredients(response.data || []);
    } catch (error: any) {
      toast.error('Failed to load ingredients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recipeIngredients.some(ing => !ing.ingredientId || !ing.quantity)) {
      toast.error('Please fill all ingredient details');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        finishedGoodId: formData.finishedGoodId,
        name: formData.name,
        description: formData.description || undefined,
        yieldQuantity: parseFloat(formData.yieldQuantity),
        yieldUnit: formData.yieldUnit,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
        ingredients: recipeIngredients.map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          wastagePercent: parseFloat(ing.wastagePercent || '0'),
          notes: ing.notes || undefined,
        })),
      };

      await api.recipes.create(payload);
      toast.success('Recipe created successfully');
      router.push('/recipes');
    } catch (error: any) {
      console.error('Failed to create recipe:', error);
      toast.error(error.response?.data?.message || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, {
      ingredientId: '',
      quantity: '',
      unit: '',
      wastagePercent: '0',
      notes: '',
    }]);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeIngredients(updated);
  };

  const handleIngredientSelect = (index: number, ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    const updated = [...recipeIngredients];
    updated[index] = {
      ...updated[index],
      ingredientId: ingredientId,
      unit: ingredient?.unit || updated[index].unit,
    };
    setRecipeIngredients(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/recipes"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Recipe</h1>
          <p className="text-gray-600 mt-1">Define a Bill of Materials for a composite item</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-purple-600" />
            Recipe Details
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finished Good (Final Product) <span className="text-red-500">*</span>
              </label>
              <select
                name="finishedGoodId"
                value={formData.finishedGoodId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select finished item...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This is the final product that will be sold (e.g., Pizza, Burger)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Margherita Pizza Recipe"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Brief description of the recipe..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yield Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="yieldQuantity"
                value={formData.yieldQuantity}
                onChange={handleChange}
                required
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 1"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many units this recipe produces
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yield Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="yieldUnit"
                value={formData.yieldUnit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., PCS, KG, L"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preparation Time (minutes)
              </label>
              <input
                type="number"
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 15"
              />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-lg shadow border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Ingredients / Raw Materials
            </h2>
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>

          <div className="space-y-4">
            {recipeIngredients.map((ingredient, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Ingredient #{index + 1}
                  </span>
                  {recipeIngredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ingredient <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ingredient.ingredientId}
                      onChange={(e) => handleIngredientSelect(index, e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select ingredient...</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} - {ing.unit}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select from raw materials/ingredients
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      required
                      step="0.01"
                      min="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., G, KG, ML"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wastage % (optional)
                    </label>
                    <input
                      type="number"
                      value={ingredient.wastagePercent}
                      onChange={(e) => updateIngredient(index, 'wastagePercent', e.target.value)}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Expected loss during preparation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={ingredient.notes}
                      onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Finely chopped"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Professional Plan:</strong> When you prepare dishes using this recipe, the system will 
              deduct the required quantity of each ingredient from inventory. When selling, only the finished 
              dish quantity is deducted (ingredients are NOT deducted twice).
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/recipes"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
