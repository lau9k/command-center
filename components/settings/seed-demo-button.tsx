"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Database, Loader2, AlertTriangle } from "lucide-react"

export function SeedDemoButton() {
  const [loading, setLoading] = useState(false)

  const handleSeed = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/seed/demo", {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Seed request failed")
      }

      const data = await res.json()
      const total = Object.values(data.seeded as Record<string, number>).reduce(
        (sum, n) => sum + n,
        0,
      )
      toast.success(`Demo data seeded — ${total} records created`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to seed demo data",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Load Demo Data</p>
        <p className="text-sm text-muted-foreground">
          Populate your workspace with sample projects, tasks, contacts, and more
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {loading ? "Seeding..." : "Seed Demo Data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Load demo data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will add sample projects, tasks, contacts, deals, content,
              sponsors, and transactions to your workspace. Existing data will
              not be modified or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeed}>
              Load Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
