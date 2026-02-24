'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { 
  ChefHat, 
  Plus,
  Search,
  TrendingUp,
  Package,
  Lock,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RecipesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <RecipesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  finishedGoodId: string;
  yieldQuantity: number;
  yieldUnit: string;
  preparationTime?: number;
  isActive: boolean;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
    wastagePercent: number;
  }>;
  finishedGood?: {
    id: string;
    name: string;
    sku: string;
  };
}

function RecipesContent() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeCosts, setRecipeCosts] = useState<Record<string, { totalCost: number; costPerUnit: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { canAccessRecipes, businessType } = useBusinessFeatures();

  const accessCheck = canAccessRecipes();

  useEffect(() => {
    if (accessCheck.canAccess) {
      loadRecipes();
    } else {
      setLoading(false);
    }
  }, [accessCheck.canAccess]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await api.recipes.list();
      const recipesData = response.data || [];
      setRecipes(recipesData);
      
      // Load costs for all recipes
      const costs: Record<string, { totalCost: number; costPerUnit: number }> = {};
      await Promise.all(
        recipesData.map(async (recipe: Recipe) => {
          try {
            const costResponse = await api.recipes.getCost(recipe.id);
            costs[recipe.id] = {
              totalCost: costResponse.data.totalCost || 0,
              costPerUnit: costResponse.data.costPerUnit || 0,
            };
          } catch (error) {
            console.error(`Failed to load cost for recipe ${recipe.id}:`, error);
            costs[recipe.id] = { totalCost: 0, costPerUnit: 0 };
          }
        })
      );
      setRecipeCosts(costs);
    } catch (error: any) {
      console.error('Failed to load recipes:', error);
      toast.error(error.response?.data?.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, recipeName: string) => {
    if (!confirm(`Are you sure you want to delete recipe "${recipeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.recipes.delete(id);
      toast.success('Recipe deleted successfully');
      loadRecipes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete recipe');
    }
  };

  // Feature & Business Type access check
  if (!accessCheck.canAccess) {
    const isBusinessTypeIssue = !accessCheck.hasBusinessType && accessCheck.hasFeature;
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe Management</h2>
            <p className="text-gray-600 mb-4">{accessCheck.reason}</p>
            
            {isBusinessTypeIssue ? (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Restaurant Feature</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Recipe/BOM Management is designed for F&B businesses (Restaurant, Hotel, Cafe).
                  Your current business type is: <span className="font-semibold">{businessType}</span>
                </p>
                <p className="text-sm text-gray-600">
                  This feature enables automatic ingredient deduction when selling composite items.
                  Contact support to update your business type if needed.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Unlock Professional Features:</h3>
                <ul className="text-sm text-left text-gray-600 space-y-1">
                  <li>✓ Bill of Materials (BOM) for composite items</li>
                  <li>✓ Auto-deduct ingredients during billing</li>
                  <li>✓ Real-time recipe costing</li>
                  <li>✓ Ingredient availability checks</li>
                  <li>✓ Wastage percentage tracking</li>
                </ul>
              </div>
            )}
            
            {!accessCheck.hasFeature && (
              <Link
                href="/subscription/upgrade"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Upgrade to Professional
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.finishedGood?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipe Management</h1>
          <p className="text-gray-600 mt-1">Manage Bills of Materials for composite items</p>
        </div>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Recipe
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Recipes</span>
            <ChefHat className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{recipes.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {recipes.filter(r => r.isActive).length} active
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg Ingredients</span>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recipes.length > 0 
              ? (recipes.reduce((sum, r) => sum + r.ingredients.length, 0) / recipes.length).toFixed(1)
              : 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Per recipe</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Ingredients</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recipes.reduce((sum, r) => sum + r.ingredients.length, 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Used across all recipes</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search recipes by name, description, or finished item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Recipes List */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No recipes found' : 'No recipes yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Create your first recipe to enable automatic ingredient deduction during billing'}
          </p>
          {!searchTerm && (
            <Link
              href="/recipes/new"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
              Create Your First Recipe
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{recipe.name}</h3>
                    <div className="text-sm text-gray-600">
                      {recipe.finishedGood?.name || 'Finished Good'}
                    </div>
                    {recipe.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recipe.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {recipe.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Yield:</span>
                    <span className="font-medium text-gray-900">
                      {recipe.yieldQuantity} {recipe.yieldUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ingredients:</span>
                    <span className="font-medium text-gray-900">
                      {recipe.ingredients.length} items
                    </span>
                  </div>
                  {recipe.preparationTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prep Time:</span>
                      <span className="font-medium text-gray-900">
                        {recipe.preparationTime} mins
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  {recipeCosts[recipe.id] ? (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Total Cost</span>
                        <span className="text-lg font-bold text-purple-700">
                          ₹{recipeCosts[recipe.id].totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Cost per {recipe.yieldUnit}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          ₹{recipeCosts[recipe.id].costPerUnit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg mb-3 text-center">
                      <span className="text-xs text-gray-500">Loading cost...</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/recipes/${recipe.id}/edit`}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm text-center flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Recipe
                    </Link>
                    <button
                      onClick={() => handleDelete(recipe.id, recipe.name)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Badge + Restaurant Feature */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature - Restaurant Only</h3>
            <p className="text-sm text-gray-600">
              Recipe Management automatically deducts ingredients from inventory when you sell composite items, ensuring accurate stock tracking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
