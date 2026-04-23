import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/adminApi";
const LowStockProducts = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const summary = await adminApi.getDashboardSummary({ threshold: 10, limit: 200 });
      setRows(
        (summary.low_stock_products || []).map((item) => ({
          name: item.name || "Unnamed Product",
          sku: item.sku || "-",
          store_name: item.store_name || "Unknown Store",
          stock_left: Number(item.stock_left || 0)
        }))
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Falha ao carregar produtos com pouco stock");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return <div className="space-y-6">
      <PageHeader
    title="Produtos com pouco stock"
    description="Produtos com stock inferior a 10, agrupados por loja."
    actions={<Button variant="outline" onClick={() => navigate("/admin")}>
            Voltar ao dashboard
          </Button>}
  />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista de stock baixo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Stock restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={4}>A carregar...</TableCell>
                </TableRow> : rows.length === 0 ? <TableRow>
                  <TableCell colSpan={4}>Nenhum produto abaixo das 10 unidades.</TableCell>
                </TableRow> : rows.map((row) => <TableRow key={`${row.sku}-${row.store_name}-${row.name}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>{row.store_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {row.stock_left} restantes
                      </Badge>
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = LowStockProducts;
export {
  stdin_default as default
};
