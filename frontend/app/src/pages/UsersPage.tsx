import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { UserRole } from '@/types';
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
import { Plus, Search, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function UsersPage() {
  const { t } = useTranslation();
  const { users, addUser, updateUser, deleteUser } = useStore();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'EMPLOYE' as UserRole,
    actif: true,
  });

  const filteredUsers = users.filter(
    (user) =>
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assignableRoles: UserRole[] =
    currentUser?.role === UserRole.SUPERVISEUR
      ? [UserRole.ADMIN, UserRole.SUPERVISEUR, UserRole.EMPLOYE]
      : [UserRole.EMPLOYE];

  const handleAdd = async () => {
    try {
      await addUser(formData);
      setIsAddDialogOpen(false);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        role: UserRole.EMPLOYE,
        actif: true,
      });
      toast.success(t('pages.users.createSuccess'));
    } catch {
      toast.error(t('pages.users.createError'));
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    const updatePayload = {
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email,
      role: formData.role,
      actif: formData.actif,
      ...(formData.password ? { password: formData.password } : {}),
    };

    try {
      await updateUser(String(selectedUser.id), updatePayload);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast.success(t('pages.users.updateSuccess'));
    } catch {
      toast.error(t('pages.users.updateError'));
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm(t('pages.users.deleteConfirm'))) {
      return;
    }

    try {
      await deleteUser(String(id));
      toast.success(t('pages.users.deleteSuccess'));
    } catch {
      toast.error(t('pages.users.deleteError'));
    }
  };

  const openEditDialog = (user: typeof users[0]) => {
    setSelectedUser(user);
    setFormData({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      password: '',
      role: user.role,
      actif: user.actif,
    });
    setIsEditDialogOpen(true);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-700';
      case UserRole.SUPERVISEUR:
        return 'bg-purple-100 text-purple-700';
      case UserRole.EMPLOYE:
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.users.title')}</h1>
          <p className="text-slate-500">{t('pages.users.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.users.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.users.createTitle')}</DialogTitle>
              <DialogDescription>{t('pages.users.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">{t('common.firstName')}</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">{t('common.name')}</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('pages.users.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('common.role')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.includes(UserRole.ADMIN) && (
                      <SelectItem value="ADMIN">{t('statusLabels.role.ADMIN')}</SelectItem>
                    )}
                    {assignableRoles.includes(UserRole.SUPERVISEUR) && (
                      <SelectItem value="SUPERVISEUR">{t('statusLabels.role.SUPERVISEUR')}</SelectItem>
                    )}
                    <SelectItem value="EMPLOYE">{t('statusLabels.role.EMPLOYE')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                {t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('pages.users.search')}
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
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.role')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('pages.users.createdAt')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.prenom} {user.nom}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {t(`statusLabels.role.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.actif ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <UserCheck className="h-4 w-4" />
                        <span className="text-sm">{t('common.active')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <UserX className="h-4 w-4" />
                        <span className="text-sm">{t('common.inactive')}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.dateCreation).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.users.editTitle')}</DialogTitle>
            <DialogDescription>{t('pages.users.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">{t('common.firstName')}</Label>
                <Input
                  id="edit-prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">{t('common.name')}</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('common.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('common.role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.includes(UserRole.ADMIN) && (
                    <SelectItem value="ADMIN">{t('statusLabels.role.ADMIN')}</SelectItem>
                  )}
                  {assignableRoles.includes(UserRole.SUPERVISEUR) && (
                    <SelectItem value="SUPERVISEUR">{t('statusLabels.role.SUPERVISEUR')}</SelectItem>
                  )}
                  <SelectItem value="EMPLOYE">{t('statusLabels.role.EMPLOYE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-actif">{t('common.status')}</Label>
              <Select
                value={formData.actif ? 'actif' : 'inactif'}
                onValueChange={(value) => setFormData({ ...formData, actif: value === 'actif' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">{t('common.active')}</SelectItem>
                  <SelectItem value="inactif">{t('common.inactive')}</SelectItem>
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
