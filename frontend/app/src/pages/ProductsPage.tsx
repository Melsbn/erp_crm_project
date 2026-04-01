import { useState } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit2, Trash2, Package, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function ProductsPage() {
  const { t } = useTranslation();
  const { produits, categories, addProduit, updateProduit, deleteProduit, addCategorie } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof produits[0] | null>(null);

  const [productForm, setProductForm] = useState({
    nom: '',
    description: '',
    prix: 0,
    stock: 0,
    disponible: true,
    categorieId: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    nom: '',
    description: '',
  });

  const filteredProducts = produits.filter(
    (product) =>
      product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = async () => {
    try {
      await addProduit(productForm);
      setIsAddProductDialogOpen(false);
      resetProductForm();
      toast.success(t('pages.products.createProductSuccess'));
    } catch {
      toast.error(t('pages.products.createProductError'));
    }
  };

  const handleAddCategory = async () => {
    try {
      await addCategorie(categoryForm);
      setIsAddCategoryDialogOpen(false);
      setCategoryForm({ nom: '', description: '' });
      toast.success(t('pages.products.createCategorySuccess'));
    } catch {
      toast.error(t('pages.products.createCategoryError'));
    }
  };

  const handleEdit = async () => {
    if (selectedProduct) {
      try {
        await updateProduit(selectedProduct.id, productForm);
        setIsEditDialogOpen(false);
        setSelectedProduct(null);
        toast.success(t('pages.products.updateSuccess'));
      } catch {
        toast.error(t('pages.products.updateError'));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('pages.products.deleteConfirm'))) {
      try {
        await deleteProduit(id);
        toast.success(t('pages.products.deleteSuccess'));
      } catch {
        toast.error(t('pages.products.deleteError'));
      }
    }
  };

  const resetProductForm = () => {
    setProductForm({
      nom: '',
      description: '',
      prix: 0,
      stock: 0,
      disponible: true,
      categorieId: '',
    });
  };

  const openEditDialog = (product: typeof produits[0]) => {
    setSelectedProduct(product);
    setProductForm({
      nom: product.nom,
      description: product.description,
      prix: product.prix,
      stock: product.stock,
      disponible: product.disponible,
      categorieId: product.categorieId,
    });
    setIsEditDialogOpen(true);
  };

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.nom || t('pages.products.uncategorized');
  };

  const stats = {
    total: produits.length,
    disponible: produits.filter((p) => p.disponible).length,
    indisponible: produits.filter((p) => !p.disponible).length,
    stockFaible: produits.filter((p) => p.stock < 20).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.products.title')}</h1>
          <p className="text-slate-500">{t('pages.products.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                {t('pages.products.newCategory')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('pages.products.createCategoryTitle')}</DialogTitle>
                <DialogDescription>{t('pages.products.createCategoryDescription')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-nom">{t('common.name')}</Label>
                  <Input
                    id="cat-nom"
                    value={categoryForm.nom}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-description">{t('common.description')}</Label>
                  <Input
                    id="cat-description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700">
                  {t('common.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('pages.products.newProduct')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('pages.products.createProductTitle')}</DialogTitle>
                <DialogDescription>{t('pages.products.createProductDescription')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">{t('common.name')}</Label>
                  <Input
                    id="nom"
                    value={productForm.nom}
                    onChange={(e) => setProductForm({ ...productForm, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('common.description')}</Label>
                  <Input
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prix">{t('common.price')} (€)</Label>
                    <Input
                      id="prix"
                      type="number"
                      value={productForm.prix}
                      onChange={(e) => setProductForm({ ...productForm, prix: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">{t('common.stock')}</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categorie">{t('common.category')}</Label>
                  <Select
                    value={String(productForm.categorieId)}
                    onValueChange={(value) => setProductForm({ ...productForm, categorieId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700">
                  {t('common.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.products.totalProducts')}</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('common.available')}s</p>
                <p className="text-xl font-bold">{stats.disponible}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('common.unavailable')}s</p>
                <p className="text-xl font-bold">{stats.indisponible}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.products.lowStock')}</p>
                <p className="text-xl font-bold">{stats.stockFaible}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">{t('common.products')}</TabsTrigger>
          <TabsTrigger value="categories">{t('pages.products.categories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={t('pages.products.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead>{t('common.price')}</TableHead>
                    <TableHead>{t('common.stock')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.nom}</TableCell>
                      <TableCell>{getCategoryName(product.categorieId)}</TableCell>
                      <TableCell>{product.prix.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>
                        <span className={product.stock < 20 ? 'text-red-600 font-medium' : ''}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.disponible ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t('common.available')}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t('common.unavailable')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.nom}</h3>
                        <p className="text-sm text-slate-500">
                          {t('pages.products.categoryProductsCount', { count: produits.filter((p) => p.categorieId === category.id).length })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{category.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.products.editTitle')}</DialogTitle>
            <DialogDescription>{t('pages.products.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nom">{t('common.name')}</Label>
              <Input
                id="edit-nom"
                value={productForm.nom}
                onChange={(e) => setProductForm({ ...productForm, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('common.description')}</Label>
              <Input
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prix">{t('common.price')} (€)</Label>
                <Input
                  id="edit-prix"
                  type="number"
                  value={productForm.prix}
                  onChange={(e) => setProductForm({ ...productForm, prix: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">{t('common.stock')}</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-disponible">{t('pages.products.availability')}</Label>
              <Select
                value={productForm.disponible ? 'true' : 'false'}
                onValueChange={(value) => setProductForm({ ...productForm, disponible: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('common.available')}</SelectItem>
                  <SelectItem value="false">{t('common.unavailable')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

