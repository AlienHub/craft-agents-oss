import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  CodePreviewOverlay,
  GenericOverlay,
  ImagePreviewOverlay,
  JSONPreviewOverlay,
  Markdown,
  PDFPreviewOverlay,
  Spinner,
  classifyFile,
} from '@craft-agent/ui'
import { AlertCircle, Copy, ExternalLink, FolderOpen, Globe } from 'lucide-react'
import { useNavigationState, isSessionsNavigation } from '@/contexts/NavigationContext'
import { routes } from '@/lib/navigate'
import { navigate } from '@/lib/navigate'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { PanelHeaderCenterButton } from '@/components/ui/PanelHeaderCenterButton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { normalizeLocalFileTarget } from '@/lib/file-link-target'
import { StyledDropdownMenuItem } from '@/components/ui/styled-dropdown'
import { toast } from 'sonner'
import { getFileManagerName } from '@/lib/platform'
import type { SessionResourceDetails } from '../../shared/types'

interface SessionResourcePreviewPageProps {
  resourceDetails: SessionResourceDetails
}

function getFileTitle(path: string): string {
  const trimmed = path.trim()
  const normalized = trimmed.replace(/\/+$/, '')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || trimmed
}

function resolveRelativePath(baseFilePath: string, nextPath: string): string {
  if (
    nextPath.startsWith('/') ||
    nextPath.startsWith('~/') ||
    nextPath.startsWith('file:') ||
    /^[a-z]+:\/\//i.test(nextPath)
  ) {
    return nextPath
  }

  const slashIndex = baseFilePath.lastIndexOf('/')
  if (slashIndex === -1) return nextPath
  const baseDir = baseFilePath.slice(0, slashIndex)
  return `${baseDir}/${nextPath.replace(/^\.\//, '')}`
}

function getUrlTitle(target: string): string {
  try {
    const parsed = new URL(target)
    return parsed.hostname || parsed.href
  } catch {
    return target
  }
}

function getUrlDisplay(target: string): string {
  try {
    const parsed = new URL(target)
    return parsed.href
  } catch {
    return target
  }
}

export default function SessionResourcePreviewPage({
  resourceDetails,
}: SessionResourcePreviewPageProps) {
  const { t } = useTranslation()
  const { rightSidebarButton, leadingAction, onOpenUrl } = useAppShellContext()
  const navigationState = useNavigationState()
  const sessionFilter = isSessionsNavigation(navigationState)
    ? navigationState.filter
    : { kind: 'allSessions' as const }

  const [textContent, setTextContent] = React.useState<string | null>(null)
  const [jsonData, setJsonData] = React.useState<unknown>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const resourceKind = resourceDetails.resource.kind
  const resourceTarget = resourceDetails.resource.target

  const resource = React.useMemo(() => (
    resourceKind === 'file'
      ? {
          ...resourceDetails.resource,
          target: normalizeLocalFileTarget(resourceTarget),
        }
      : resourceDetails.resource
  ), [resourceDetails.resource, resourceKind, resourceTarget])
  const classification = React.useMemo(
    () => (resource.kind === 'file' ? classifyFile(resource.target) : null),
    [resource.kind, resource.target]
  )
  const classificationType = classification?.type ?? null
  const canPreview = classification?.canPreview ?? false

  const openResourcePanel = React.useCallback((kind: 'file' | 'url', target: string) => {
    navigate(routes.view.sessionResource({
      sessionId: resourceDetails.sessionId,
      resourceKind: kind,
      target,
      filter: sessionFilter,
    }), { newPanel: true })
  }, [resourceDetails.sessionId, sessionFilter])

  const handleNestedFileClick = React.useCallback((path: string) => {
    const resolvedPath = resource.kind === 'file'
      ? resolveRelativePath(resource.target, path)
      : path
    openResourcePanel('file', resolvedPath)
  }, [openResourcePanel, resource])

  const handleNestedUrlClick = React.useCallback((url: string) => {
    onOpenUrl(url)
  }, [onOpenUrl])

  React.useEffect(() => {
    if (resource.kind !== 'file') {
      setTextContent(null)
      setJsonData(null)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    if (!canPreview || !classificationType) {
      setTextContent(null)
      setJsonData(null)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    if (!['code', 'markdown', 'json', 'text'].includes(classificationType)) {
      setTextContent(null)
      setJsonData(null)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    window.electronAPI.readFile(resource.target)
      .then((content) => {
        if (cancelled) return
        setTextContent(content)
        if (classificationType === 'json') {
          try {
            setJsonData(JSON.parse(content))
          } catch (error) {
            setJsonData(null)
            setLoadError(error instanceof Error ? error.message : 'Failed to parse JSON')
          }
        } else {
          setJsonData(null)
        }
      })
      .catch((error) => {
        if (cancelled) return
        setTextContent(null)
        setJsonData(null)
        setLoadError(error instanceof Error ? error.message : 'Failed to read file')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [resource.kind, resource.target, canPreview, classificationType])

  const openExternally = React.useCallback(() => {
    if (resource.kind === 'file') {
      void window.electronAPI.openFile(resource.target)
      return
    }

    void window.electronAPI.openUrl(resource.target)
  }, [resource])

  const handleCopyPath = React.useCallback(async () => {
    if (resource.kind !== 'file') return
    await navigator.clipboard.writeText(resource.target)
    toast.success(t('toast.pathCopied'))
  }, [resource, t])

  const handleShowInFinder = React.useCallback(async () => {
    if (resource.kind !== 'file') return
    await window.electronAPI.showInFolder(resource.target)
  }, [resource])

  const headerActions = (
    <PanelHeaderCenterButton
      icon={resource.kind === 'url' ? <Globe className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
      onClick={openExternally}
      tooltip={t('common.open')}
    />
  )

  const fileTitleMenu = resource.kind === 'file' ? (
    <>
      <StyledDropdownMenuItem onClick={openExternally}>
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="flex-1">{t('common.open')}</span>
      </StyledDropdownMenuItem>
      <StyledDropdownMenuItem onClick={handleShowInFinder}>
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1">{t('sessionMenu.showInFileManager', { fileManager: getFileManagerName() })}</span>
      </StyledDropdownMenuItem>
      <StyledDropdownMenuItem onClick={handleCopyPath}>
        <Copy className="h-3.5 w-3.5" />
        <span className="flex-1">{t('sessionMenu.copyPath')}</span>
      </StyledDropdownMenuItem>
    </>
  ) : undefined

  if (resource.kind === 'url') {
    return (
      <div className="h-full flex flex-col min-h-0 bg-background">
        <PanelHeader
          title={getUrlTitle(resource.target)}
          actions={headerActions}
          leadingAction={leadingAction}
          rightSidebarButton={rightSidebarButton}
        />
        <div className="flex-1 min-h-0 bg-white">
          <iframe
            src={resource.target}
            title={getUrlDisplay(resource.target)}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    )
  }

  const fileTitle = getFileTitle(resource.target)

  if (!classification?.canPreview || !classification.type) {
    return (
      <div className="h-full flex flex-col min-h-0 bg-background">
        <PanelHeader
          title={fileTitle}
          titleMenu={fileTitleMenu}
          actions={headerActions}
          leadingAction={leadingAction}
          rightSidebarButton={rightSidebarButton}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">This file type does not support in-panel preview yet.</p>
          <p className="max-w-[720px] text-xs">{resource.target}</p>
        </div>
      </div>
    )
  }

  const body = (() => {
    if (classification.type === 'image') {
      return (
        <ImagePreviewOverlay
          isOpen={true}
          onClose={() => {}}
          filePath={resource.target}
          loadDataUrl={(path) => window.electronAPI.readFileDataUrl(path)}
          embedded
          hideHeader
        />
      )
    }

    if (classification.type === 'pdf') {
      return (
        <PDFPreviewOverlay
          isOpen={true}
          onClose={() => {}}
          filePath={resource.target}
          loadPdfData={(path) => window.electronAPI.readFileBinary(path)}
          embedded
          hideHeader
        />
      )
    }

    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      )
    }

    if (classification.type === 'code') {
      return (
        <CodePreviewOverlay
          isOpen={true}
          onClose={() => {}}
          content={textContent ?? ''}
          filePath={resource.target}
          error={loadError ?? undefined}
          embedded
          hideHeader
        />
      )
    }

    if (classification.type === 'json') {
      return (
        <JSONPreviewOverlay
          isOpen={true}
          onClose={() => {}}
          data={jsonData ?? {}}
          filePath={resource.target}
          error={loadError ?? undefined}
          embedded
          hideHeader
        />
      )
    }

    if (classification.type === 'text') {
      return (
        <GenericOverlay
          isOpen={true}
          onClose={() => {}}
          content={textContent ?? ''}
          title={resource.target}
          language="text"
          error={loadError ?? undefined}
          embedded
          hideHeader
        />
      )
    }

    return (
      <div className="h-full min-h-0 bg-foreground-3">
        <div
          className="h-full"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)',
          }}
        >
          <ScrollArea className="h-full min-w-0">
            <div className="mx-auto min-h-full w-full max-w-[1080px] px-6 py-4">
              <div className="mx-auto w-full max-w-[960px] rounded-[16px] bg-background px-10 py-8 shadow-strong">
                {loadError ? (
                  <div className="text-sm text-destructive">{loadError}</div>
                ) : (
                  <div className="text-sm">
                    <Markdown
                      mode="minimal"
                      onFileClick={handleNestedFileClick}
                      onUrlClick={handleNestedUrlClick}
                      hideFirstMermaidExpand={false}
                    >
                      {textContent ?? ''}
                    </Markdown>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  })()

  return (
    <div className="group h-full flex flex-col min-h-0 bg-background">
      <PanelHeader
        title={fileTitle}
        titleMenu={fileTitleMenu}
        actions={headerActions}
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {body}
      </div>
    </div>
  )
}
