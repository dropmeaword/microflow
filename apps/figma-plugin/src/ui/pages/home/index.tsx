import { Button, cva, Icons } from "@fhb/ui";
import { PageContent } from "../../components/Page";

import { ConnectionStatus, useMqtt } from "@fhb/mqtt/client";
import { Link } from "react-router-dom";
import { useSetWindowSize } from "../../hooks/useSetWindowSize";

function ConnectionStatusBadge({
  title,
  status,
}: {
  title: string;
  status?: ConnectionStatus;
}) {
  return (
    <div className="flex items-center">
      {title}
      <span
        className={connectionStatusBadge({ status })}
        title={status}
        aria-busy={status !== "connected"}
      />
    </div>
  );
}

const connectionStatusBadge = cva(
  "ml-2 pointer-events-none w-2 h-2 rounded-full",
  {
    variants: {
      status: {
        undefined: "bg-yellow-500 text-yellow-900 animate-pulse",
        connected: "bg-green-500 text-green-900",
        connecting: "bg-green-400 text-green-800 animate-pulse",
        disconnected: "bg-red-500 text-red-900 animate-pulse",
      },
    },
  },
);

export function Home() {
  const { status, connectedClients } = useMqtt();
  useSetWindowSize({ width: 250, height: 160 });

  console.log("home", connectedClients);
  return (
    <>
      <PageContent>
        <section className="flex items-center justify-between">
          <ConnectionStatusBadge title="Mqtt" status={status} />
          <Button variant="ghost" size="icon" title="Mqtt settings" asChild>
            <Link to="/mqtt">
              <Icons.ServerCog className="w-4 h-4" opacity="80%" />
            </Link>
          </Button>
        </section>
        <section className="flex items-center justify-between">
          <div className="flex items-center">
            <ConnectionStatusBadge
              title="App"
              status={connectedClients.get("app")}
            />
          </div>
          <div className="space-x-1">
            <Button variant="ghost" size="icon" title="How to use">
              <Icons.ExternalLink className="w-4 h-4" opacity="80%" />
            </Button>
            <Button variant="ghost" size="icon" title="Serial settings">
              <Icons.Cog className="w-4 h-4" opacity="80%" />
            </Button>
          </div>
        </section>
        <a href="https://www.sanderboer.nl" target="_blank" className="py-2 text-center opacity-60 transition-all hover:opacity-100 hover:underline text-gray-50/40">
          Made with ♥ by Xiduzo
        </a>
      </PageContent>
    </>
  );
}