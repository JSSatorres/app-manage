import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  E2E_BASE_URL,
  hasE2EAuthCredentials,
  loginAsE2ETestUser,
  missingE2EAuthCredentialsReason,
} from "./support/auth";

type ScrollMetrics = {
  name: string;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  overflowY: string;
  scrollWidth: number;
  clientWidth: number;
};

type StaticScrollContract = {
  tabIndex: number;
  overflowY: string;
  maxHeight: string;
  scrollbarGutter: string;
  className: string;
  tagName: string;
  role: string | null;
  ariaLabel: string | null;
  ariaLabelledby: string | null;
};

function projectArtifactName(projectName: string) {
  return projectName.toLowerCase().replace(/\s+/g, "-");
}

function collectApplicationErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });

  return errors;
}

async function scrollMetrics(region: Locator, name: string): Promise<ScrollMetrics> {
  return region.evaluate((element, regionName) => {
    const styles = window.getComputedStyle(element);

    return {
      name: regionName,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      overflowY: styles.overflowY,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  }, name);
}

async function staticScrollContract(region: Locator): Promise<StaticScrollContract> {
  return region.evaluate((element) => {
    const styles = window.getComputedStyle(element);

    return {
      tabIndex: element.tabIndex,
      overflowY: styles.overflowY,
      maxHeight: styles.maxHeight,
      scrollbarGutter: styles.scrollbarGutter,
      className: element.className,
      tagName: element.tagName,
      role: element.getAttribute("role"),
      ariaLabel: element.getAttribute("aria-label"),
      ariaLabelledby: element.getAttribute("aria-labelledby"),
    };
  });
}

test.describe("Sedes — accordion y scroll", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2EAuthCredentials, missingE2EAuthCredentialsReason);
    await loginAsE2ETestUser(page);
  });

  test("permite desplegar sedes y desplazarse en una región con contenido largo", async ({ page }, testInfo) => {
    const applicationErrors = collectApplicationErrors(page);

    await page.goto(`${E2E_BASE_URL}/sedes`);
    await expect(page).toHaveURL(/\/sedes$/);
    await expect(page.getByRole("heading", { name: "Sedes", exact: true })).toBeVisible();
    await expect(page.getByText("Algo salió mal", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/Unhandled Runtime Error|Application error: a client-side exception|Build Error/i)).toHaveCount(
      0,
    );

    const sedeControls = page.getByRole("button", { name: /^Mostrar equipos de / });
    await expect(sedeControls).toHaveCount(2, { timeout: 15_000 });

    const firstSedeControl = sedeControls.first();
    const secondSedeLabel = await sedeControls.nth(1).getAttribute("aria-label");
    expect(secondSedeLabel).toBeTruthy();
    const firstSedeLabel = await firstSedeControl.getAttribute("aria-label");
    expect(firstSedeLabel).toBeTruthy();
    const firstSedeName = firstSedeLabel!.replace("Mostrar equipos de ", "");

    await firstSedeControl.click();
    await expect(page.getByRole("button", { name: `Ocultar equipos de ${firstSedeName}` })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const openedSedeControl = page.getByRole("button", { name: `Ocultar equipos de ${firstSedeName}` });
    await openedSedeControl.focus();
    await openedSedeControl.press("Space");
    await expect(page.getByRole("button", { name: `Mostrar equipos de ${firstSedeName}` })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const reopenedSedeControl = page.getByRole("button", { name: `Mostrar equipos de ${firstSedeName}` });
    await reopenedSedeControl.focus();
    await reopenedSedeControl.press("Enter");
    await expect(page.getByRole("button", { name: `Ocultar equipos de ${firstSedeName}` })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const secondSedeControl = page.getByRole("button", { name: secondSedeLabel! });
    await secondSedeControl.scrollIntoViewIfNeeded();
    await expect(secondSedeControl).toBeVisible();

    const equiposRegion = page.getByRole("region", { name: `Equipos de ${firstSedeName}` });
    await expect(equiposRegion).toBeVisible();
    const firstEquipoControl = equiposRegion.getByRole("button", { name: /^Mostrar contenido de / }).first();
    await expect(firstEquipoControl).toBeVisible({ timeout: 15_000 });

    const firstEquipoLabel = await firstEquipoControl.getAttribute("aria-label");
    expect(firstEquipoLabel).toBeTruthy();
    const firstEquipoName = firstEquipoLabel!.replace("Mostrar contenido de ", "");
    await firstEquipoControl.click();
    await expect(
      equiposRegion.getByRole("button", { name: `Ocultar contenido de ${firstEquipoName}` }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(equiposRegion.getByText("Editar", { exact: true }).first()).toBeVisible();

    const sesionesRegion = page.getByRole("region", { name: `Lista de sesiones de ${firstEquipoName}` });
    const miembrosRegion = page.getByRole("region", { name: `Lista de miembros de ${firstEquipoName}` });
    await expect(sesionesRegion).toBeVisible();

    const candidates: Array<{ name: string; region: Locator }> = [
      { name: `Equipos de ${firstSedeName}`, region: equiposRegion },
      { name: `Lista de sesiones de ${firstEquipoName}`, region: sesionesRegion },
    ];
    if (await miembrosRegion.count()) {
      await expect(miembrosRegion).toBeVisible();
      candidates.push({ name: `Lista de miembros de ${firstEquipoName}`, region: miembrosRegion });
    }

    const metrics = await Promise.all(candidates.map(({ name, region }) => scrollMetrics(region, name)));
    const overflowing = metrics.find((metric) => metric.scrollHeight > metric.clientHeight);
    const documentMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    console.log(
      `SEDES_SCROLL_METRICS project=${testInfo.project.name} ${JSON.stringify({ metrics, documentMetrics })}`,
    );
    await page.screenshot({
      path: `test-results/sedes-scroll-playwright-${projectArtifactName(testInfo.project.name)}.png`,
      fullPage: true,
    });

    expect(applicationErrors, `Errores de consola/página: ${JSON.stringify(applicationErrors)}`).toEqual([]);
    expect(documentMetrics.scrollWidth, `Overflow horizontal del documento: ${JSON.stringify(documentMetrics)}`).toBeLessThanOrEqual(
      documentMetrics.clientWidth,
    );

    let dynamicScrollExercised = false;
    let scrollResult: { before: number; after: number } | undefined;

    if (overflowing) {
      const overflowCandidate = candidates.find(({ name }) => name === overflowing.name)!;
      scrollResult = await overflowCandidate.region.evaluate((element) => {
        const before = element.scrollTop;
        element.scrollTop = Math.min(element.scrollHeight - element.clientHeight, Math.max(1, before + 96));
        return { before, after: element.scrollTop };
      });
      expect(scrollResult.after, `El scroll no avanzó. Métricas: ${JSON.stringify(metrics)}`).toBeGreaterThan(
        scrollResult.before,
      );
      dynamicScrollExercised = true;
    } else {
      for (const { name, region } of candidates) {
        const contract = await staticScrollContract(region);
        expect(contract.tabIndex, `${name} debe ser enfocable. Contrato: ${JSON.stringify(contract)}`).toBe(0);
        expect(["auto", "scroll"], `${name} debe permitir scroll vertical. Contrato: ${JSON.stringify(contract)}`).toContain(
          contract.overflowY,
        );
        expect(contract.maxHeight, `${name} debe tener altura máxima finita. Contrato: ${JSON.stringify(contract)}`).not.toBe(
          "none",
        );
        expect(Number.parseFloat(contract.maxHeight), `${name} debe tener altura máxima positiva. Contrato: ${JSON.stringify(contract)}`).toBeGreaterThan(
          0,
        );
        expect(
          contract.scrollbarGutter.includes("stable") || contract.className.includes("[scrollbar-gutter:stable]"),
          `${name} debe reservar espacio para la barra. Contrato: ${JSON.stringify(contract)}`,
        ).toBe(true);
        expect(
          (contract.role === "region" || contract.tagName === "SECTION") &&
            Boolean(contract.ariaLabel || contract.ariaLabelledby),
          `${name} debe conservar semántica ARIA. Contrato: ${JSON.stringify(contract)}`,
        ).toBe(true);
        await region.focus();
        await expect(region).toBeFocused();
      }
    }

    console.log(
      `SEDES_SCROLL_RESULT project=${testInfo.project.name} ${JSON.stringify({ dynamicScrollExercised, scrollResult })}`,
    );
  });
});
