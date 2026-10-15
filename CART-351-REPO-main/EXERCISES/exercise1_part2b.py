#
# CART 351 EXERCISE ONE PART TWO B
#
# Exploring the STAR WARS API: get the planet names, their diameter and
# population with requests, then display them in a table using rich.
#

import requests
from rich.console import Console
from rich.table import Table
from rich import box

table = Table(box=box.SQUARE, header_style="bold")
table.add_column("NAME", style="magenta")
table.add_column("DIAMETER", style="blue")
table.add_column("POPULATION", style="cyan")

# planets 1 to 14 (Tatooine to Kashyyyk)
for planet_id in range(1, 15):
	planet = requests.get(f"https://swapi.dev/api/planets/{planet_id}/").json()
	table.add_row(planet["name"], planet["diameter"], planet["population"])

console = Console()
console.print(table)
