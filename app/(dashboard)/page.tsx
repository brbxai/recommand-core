import { Button } from "@core/components/ui/button";
import { useMenuItemActions, useMenuItems } from "@core/lib/menu-store";
import { Paperclip } from "lucide-react";

export default function Page() {
  const menuItems = useMenuItems();
  const { registerMenuItem } = useMenuItemActions();
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-60 flex-1 rounded-xl p-4 bg-muted" >
        {Array.from(menuItems.values()).map((item) => (
          <div key={item.title} className="flex items-center gap-2">
            {/* {item.icon} */}
            {item.title}
          </div>
        ))}
        <Button
          className="mt-4"
          onClick={() => {
            const now = new Date().toISOString();
            registerMenuItem({
              id: `test-${now}`,
              title: `Test ${now}`,
              icon: Paperclip,
              onClick: () => { },
            });
          }}>
          Register new menu item
        </Button>
      </div>
    </div>
  )
}
