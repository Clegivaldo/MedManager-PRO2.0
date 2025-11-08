import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useColorTheme } from "@/providers/ColorThemeProvider"
import { Moon, Sun, Palette } from "lucide-react"

const colorThemes = [
    { name: "Padrão", value: "zinc", color: "bg-slate-800" },
    { name: "Azul", value: "blue", color: "bg-blue-600" },
    { name: "Verde", value: "green", color: "bg-green-600" },
    { name: "Laranja", value: "orange", color: "bg-orange-600" },
]

export function ThemeSelector() {
  const { setTheme: setMode } = useTheme()
  const { setTheme: setColor } = useColorTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Alterar Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("system")}>
          <Palette className="mr-2 h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Cor</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {colorThemes.map((theme) => (
                <DropdownMenuItem key={theme.value} onClick={() => setColor(theme.value as any)}>
                  <div className={`w-4 h-4 rounded-full ${theme.color} mr-2 border`} />
                  <span>{theme.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
